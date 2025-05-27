const { client } = require('../config/elasticsearch');
const SearchIndex = require('../models/SearchIndex');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'search-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL
});

redis.connect().catch(console.error);

const searchVlogs = async (req, res) => {
  try {
    const {
      query,
      category,
      author,
      tags,
      status = 'published',
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc'
    } = req.query;

    const searchQuery = {
      bool: {
        must: [
          {
            multi_match: {
              query: query || '',
              fields: ['title^2', 'content'],
              fuzziness: 'AUTO'
            }
          }
        ],
        filter: [
          { term: { status } }
        ]
      }
    };

    // Add filters if provided
    if (category) {
      searchQuery.bool.filter.push({ term: { category } });
    }
    if (author) {
      searchQuery.bool.filter.push({ term: { author } });
    }
    if (tags) {
      searchQuery.bool.filter.push({ terms: { tags: tags.split(',') } });
    }

    const response = await client.search({
      index: 'vlogs',
      body: {
        query: searchQuery,
        sort: [
          { [sortBy]: { order: sortOrder } }
        ],
        from: (page - 1) * limit,
        size: parseInt(limit)
      }
    });

    const results = {
      total: response.hits.total.value,
      hits: response.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source
      })),
      page: parseInt(page),
      pages: Math.ceil(response.hits.total.value / limit)
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const indexVlog = async (req, res) => {
  try {
    const { id, ...vlogData } = req.body;

    await client.index({
      index: 'vlogs',
      id,
      body: vlogData
    });

    res.json({ message: 'Vlog indexed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateVlogIndex = async (req, res) => {
  try {
    const { id, ...vlogData } = req.body;

    await client.update({
      index: 'vlogs',
      id,
      body: {
        doc: vlogData
      }
    });

    res.json({ message: 'Vlog index updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteVlogIndex = async (req, res) => {
  try {
    const { id } = req.params;

    await client.delete({
      index: 'vlogs',
      id
    });

    res.json({ message: 'Vlog index deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    const response = await client.search({
      index: 'vlogs',
      body: {
        suggest: {
          title_suggest: {
            prefix: query,
            completion: {
              field: 'title',
              size: 5,
              skip_duplicates: true
            }
          },
          tag_suggest: {
            prefix: query,
            completion: {
              field: 'tags',
              size: 5,
              skip_duplicates: true
            }
          }
        }
      }
    });

    const suggestions = {
      titles: response.suggest.title_suggest[0].options.map(option => option.text),
      tags: response.suggest.tag_suggest[0].options.map(option => option.text)
    };

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search documents
exports.search = async (req, res) => {
  try {
    const {
      query,
      type,
      page = 1,
      limit = 20,
      sort = 'relevance',
      filters = {}
    } = req.query;

    // Try to get from cache first
    const cacheKey = `search:${query}:${type}:${page}:${limit}:${sort}:${JSON.stringify(filters)}`;
    const cachedResults = await redis.get(cacheKey);
    
    if (cachedResults) {
      return res.json({
        success: true,
        data: JSON.parse(cachedResults)
      });
    }

    // Build search query
    const searchQuery = {
      $text: { $search: query }
    };

    if (type) {
      searchQuery.type = type;
    }

    // Add filters
    if (filters.category) {
      searchQuery['metadata.category'] = filters.category;
    }
    if (filters.author) {
      searchQuery['metadata.author'] = filters.author;
    }
    if (filters.status) {
      searchQuery['metadata.status'] = filters.status;
    }
    if (filters.visibility) {
      searchQuery['metadata.visibility'] = filters.visibility;
    }
    if (filters.tags && filters.tags.length > 0) {
      searchQuery.tags = { $in: filters.tags };
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'relevance':
        sortOptions = { score: { $meta: 'textScore' } };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'popular':
        sortOptions = { 'metadata.stats.views': -1 };
        break;
      case 'trending':
        sortOptions = { 'metadata.stats.likes': -1 };
        break;
      default:
        sortOptions = { score: { $meta: 'textScore' } };
    }

    const results = await SearchIndex.find(searchQuery, {
      score: { $meta: 'textScore' }
    })
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('metadata.author', 'username avatar')
      .populate('metadata.category', 'name slug')
      .lean();

    const total = await SearchIndex.countDocuments(searchQuery);

    const response = {
      results,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(response), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
};

// Index a document
exports.indexDocument = async (req, res) => {
  try {
    const {
      type,
      documentId,
      title,
      description,
      content,
      tags,
      metadata
    } = req.body;

    const searchIndex = new SearchIndex({
      type,
      documentId,
      title,
      description,
      content,
      tags,
      metadata
    });

    await searchIndex.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'document-indexed',
      messages: [
        { value: JSON.stringify(searchIndex) }
      ]
    });

    // Clear related caches
    await redis.del(`search:${type}:${documentId}`);
    await redis.del(`search:${type}:${metadata.author}`);

    res.status(201).json({
      success: true,
      data: searchIndex
    });
  } catch (error) {
    console.error('Error indexing document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to index document'
    });
  }
};

// Update indexed document
exports.updateIndex = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const searchIndex = await SearchIndex.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!searchIndex) {
      return res.status(404).json({
        success: false,
        error: 'Indexed document not found'
      });
    }

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'document-updated',
      messages: [
        { value: JSON.stringify(searchIndex) }
      ]
    });

    // Clear related caches
    await redis.del(`search:${searchIndex.type}:${searchIndex.documentId}`);
    await redis.del(`search:${searchIndex.type}:${searchIndex.metadata.author}`);

    res.json({
      success: true,
      data: searchIndex
    });
  } catch (error) {
    console.error('Error updating index:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update index'
    });
  }
};

// Delete indexed document
exports.deleteIndex = async (req, res) => {
  try {
    const { id } = req.params;

    const searchIndex = await SearchIndex.findById(id);

    if (!searchIndex) {
      return res.status(404).json({
        success: false,
        error: 'Indexed document not found'
      });
    }

    await searchIndex.remove();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'document-deleted',
      messages: [
        { value: JSON.stringify({ id: searchIndex._id }) }
      ]
    });

    // Clear related caches
    await redis.del(`search:${searchIndex.type}:${searchIndex.documentId}`);
    await redis.del(`search:${searchIndex.type}:${searchIndex.metadata.author}`);

    res.json({
      success: true,
      message: 'Indexed document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting index:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete index'
    });
  }
};

module.exports = {
  searchVlogs,
  indexVlog,
  updateVlogIndex,
  deleteVlogIndex,
  getSuggestions,
  search,
  indexDocument,
  updateIndex,
  deleteIndex
}; 
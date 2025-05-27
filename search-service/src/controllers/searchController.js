const { client } = require('../config/elasticsearch');
const SearchIndex = require('../models/SearchIndex');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'search-service',
  brokers: process.env.KAFKA_BROKERS
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
const search = async (req, res) => {
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
    .limit(parseInt(limit));

    const total = await SearchIndex.countDocuments(searchQuery);

    // Cache results for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify({
      results,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }));

    res.json({
      success: true,
      data: {
        results,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Index document
const indexDocument = async (req, res) => {
  try {
    const document = new SearchIndex(req.body);
    await document.save();

    // Send event to Kafka
    await producer.send({
      topic: 'document-indexed',
      messages: [
        {
          value: JSON.stringify({
            type: document.type,
            documentId: document.documentId
          })
        }
      ]
    });

    // Clear related caches
    const cacheKeys = await redis.keys(`search:*:${document.type}:*`);
    if (cacheKeys.length > 0) {
      await redis.del(cacheKeys);
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update indexed document
const updateIndex = async (req, res) => {
  try {
    const document = await SearchIndex.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Send event to Kafka
    await producer.send({
      topic: 'document-updated',
      messages: [
        {
          value: JSON.stringify({
            type: document.type,
            documentId: document.documentId
          })
        }
      ]
    });

    // Clear related caches
    const cacheKeys = await redis.keys(`search:*:${document.type}:*`);
    if (cacheKeys.length > 0) {
      await redis.del(cacheKeys);
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete indexed document
const deleteIndex = async (req, res) => {
  try {
    const document = await SearchIndex.findByIdAndDelete(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Send event to Kafka
    await producer.send({
      topic: 'document-deleted',
      messages: [
        {
          value: JSON.stringify({
            type: document.type,
            documentId: document.documentId
          })
        }
      ]
    });

    // Clear related caches
    const cacheKeys = await redis.keys(`search:*:${document.type}:*`);
    if (cacheKeys.length > 0) {
      await redis.del(cacheKeys);
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
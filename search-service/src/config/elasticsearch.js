const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
});

// Index mappings
const vlogMapping = {
  properties: {
    title: { type: 'text', analyzer: 'standard' },
    content: { type: 'text', analyzer: 'standard' },
    author: { type: 'keyword' },
    category: { type: 'keyword' },
    tags: { type: 'keyword' },
    status: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    publishedAt: { type: 'date' },
    likes: { type: 'integer' },
    views: { type: 'integer' }
  }
};

// Initialize indices
const initializeIndices = async () => {
  try {
    // Check if vlog index exists
    const indexExists = await client.indices.exists({ index: 'vlogs' });
    
    if (!indexExists) {
      // Create vlog index with mapping
      await client.indices.create({
        index: 'vlogs',
        body: {
          mappings: vlogMapping
        }
      });
      console.log('Vlog index created successfully');
    }
  } catch (error) {
    console.error('Error initializing Elasticsearch indices:', error);
  }
};

module.exports = {
  client,
  initializeIndices
}; 
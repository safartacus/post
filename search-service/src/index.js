require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

const searchRoutes = require('./routes/searchRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Redis Client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Kafka Consumer
const kafka = new Kafka({
  clientId: 'search-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const consumer = kafka.consumer({ groupId: 'search-service-group' });

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ 
    topics: [
      'content-created',
      'content-updated',
      'content-deleted',
      'user-created',
      'user-updated',
      'user-deleted',
      'category-created',
      'category-updated',
      'category-deleted'
    ] 
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());

      switch (topic) {
        case 'content-created':
        case 'user-created':
        case 'category-created':
          await mongoose.model('SearchIndex').create({
            type: topic.split('-')[0],
            documentId: data.id,
            title: data.title || data.name || data.username,
            description: data.description,
            content: data.content,
            tags: data.tags,
            metadata: {
              author: data.author,
              category: data.category,
              status: data.status,
              visibility: data.visibility,
              stats: data.stats,
              publishedAt: data.publishedAt
            }
          });
          break;

        case 'content-updated':
        case 'user-updated':
        case 'category-updated':
          await mongoose.model('SearchIndex').findOneAndUpdate(
            {
              type: topic.split('-')[0],
              documentId: data.id
            },
            {
              title: data.title || data.name || data.username,
              description: data.description,
              content: data.content,
              tags: data.tags,
              metadata: {
                author: data.author,
                category: data.category,
                status: data.status,
                visibility: data.visibility,
                stats: data.stats,
                publishedAt: data.publishedAt
              }
            },
            { new: true }
          );
          break;

        case 'content-deleted':
        case 'user-deleted':
        case 'category-deleted':
          await mongoose.model('SearchIndex').findOneAndDelete({
            type: topic.split('-')[0],
            documentId: data.id
          });
          break;
      }

      // Clear related caches
      await redisClient.del(`search:${topic.split('-')[0]}:${data.id}`);
      if (data.author) {
        await redisClient.del(`search:${topic.split('-')[0]}:${data.author}`);
      }
    }
  });
};

runConsumer().catch(console.error);

// Routes
app.use('/api/search', searchRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Search service is running on port ${PORT}`);
}); 
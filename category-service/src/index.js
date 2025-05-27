require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Kafka } = require('kafkajs');
const Redis = require('redis');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/category-service', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Kafka setup
const kafka = new Kafka({
  clientId: 'category-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'category-service-group' });

// Kafka consumer setup
async function setupKafkaConsumer() {
  await consumer.connect();
  
  // Subscribe to topics
  await consumer.subscribe({ topic: 'content-created', fromBeginning: true });
  await consumer.subscribe({ topic: 'content-deleted', fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());
      
      // Process category-related events
      switch (topic) {
        case 'content-created':
          // Update category stats when content is created
          if (data.categoryId) {
            await mongoose.model('Category').findByIdAndUpdate(
              data.categoryId,
              { $inc: { 'stats.contentCount': 1 } }
            );
            // Clear cache
            await redis.del('categories:all');
            await redis.del('categories:tree');
          }
          break;
        case 'content-deleted':
          // Update category stats when content is deleted
          if (data.categoryId) {
            await mongoose.model('Category').findByIdAndUpdate(
              data.categoryId,
              { $inc: { 'stats.contentCount': -1 } }
            );
            // Clear cache
            await redis.del('categories:all');
            await redis.del('categories:tree');
          }
          break;
      }
    }
  });
}

setupKafkaConsumer().catch(console.error);

// Routes
app.use('/api/categories', categoryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Category Service Error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Category service listening on port ${PORT}`);
}); 
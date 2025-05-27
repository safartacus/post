require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Kafka } = require('kafkajs');
const Redis = require('redis');
const contentRoutes = require('./routes/contentRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/content-service', {
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
  clientId: 'content-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'content-service-group' });

// Kafka consumer setup
async function setupKafkaConsumer() {
  await consumer.connect();
  
  // Subscribe to topics
  await consumer.subscribe({ topic: 'user-deleted', fromBeginning: true });
  await consumer.subscribe({ topic: 'category-updated', fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());
      
      switch (topic) {
        case 'user-deleted':
          // Handle user deletion
          await mongoose.model('Content').updateMany(
            { author: data.userId },
            { $set: { status: 'archived' } }
          );
          break;
          
        case 'category-updated':
          // Handle category updates
          await mongoose.model('Content').updateMany(
            { category: data.categoryId },
            { $set: { 'category.name': data.name } }
          );
          break;
      }
    }
  });
}

setupKafkaConsumer().catch(console.error);

// Routes
app.use('/api/content', contentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Content service listening on port ${PORT}`);
}); 
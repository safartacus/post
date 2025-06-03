require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Kafka } = require('kafkajs');
const Redis = require('redis');
const mediaRoutes = require('./routes/mediaRoutes');
const { initializeBuckets } = require('./config/minio');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Initialize MinIO buckets
initializeBuckets()
  .then(() => console.log('MinIO buckets initialized'))
  .catch(err => console.error('MinIO initialization error:', err));

// Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Kafka consumer
const kafka = new Kafka({
  clientId: 'media-service',
  brokers: [process.env.KAFKA_BROKER]
});

const consumer = kafka.consumer({ groupId: 'media-service-group' });

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ['media-events'], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log('Received event:', event);

        // Handle media events
        switch (event.type) {
          case 'MEDIA_DELETED':
            // Clear Redis cache for deleted media
            await redisClient.del(`media:${event.data.mediaId}`);
            break;
          case 'MEDIA_UPDATED':
            // Update Redis cache for updated media
            await redisClient.del(`media:${event.data.mediaId}`);
            break;
        }
      } catch (error) {
        console.error('Error processing Kafka message:', error);
      }
    }
  });
};

runConsumer().catch(console.error);

// API routes
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
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
app.listen(PORT, () => {
  console.log(`Media service is running on port ${PORT}`);
}); 
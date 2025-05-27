require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

const commentRoutes = require('./routes/commentRoutes');

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
  clientId: 'comment-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const consumer = kafka.consumer({ groupId: 'comment-service-group' });

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ['content-deleted', 'user-deleted'] });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());

      switch (topic) {
        case 'content-deleted':
          // Delete all comments for the deleted content
          await mongoose.model('Comment').updateMany(
            { contentId: data.contentId },
            { isDeleted: true, deletedAt: new Date() }
          );
          break;

        case 'user-deleted':
          // Mark all comments by the deleted user as deleted
          await mongoose.model('Comment').updateMany(
            { author: data.userId },
            { isDeleted: true, deletedAt: new Date() }
          );
          break;
      }

      // Clear related caches
      await redisClient.del(`comments:content:${data.contentId}`);
      await redisClient.del(`comments:user:${data.userId}`);
    }
  });
};

runConsumer().catch(console.error);

// Routes
app.use('/api/comments', commentRoutes);

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

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Comment service is running on port ${PORT}`);
}); 
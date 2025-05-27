require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

const notificationRoutes = require('./routes/notificationRoutes');

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
  clientId: 'notification-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ 
    topics: [
      'user-followed',
      'content-liked',
      'comment-created',
      'comment-replied',
      'user-mentioned'
    ] 
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());

      switch (topic) {
        case 'user-followed':
          await mongoose.model('Notification').create({
            recipient: data.followedId,
            sender: data.followerId,
            type: 'follow',
            content: `${data.followerName} started following you`,
            reference: {
              type: 'user',
              id: data.followerId
            }
          });
          break;

        case 'content-liked':
          await mongoose.model('Notification').create({
            recipient: data.authorId,
            sender: data.userId,
            type: 'like',
            content: `${data.userName} liked your content`,
            reference: {
              type: 'content',
              id: data.contentId
            }
          });
          break;

        case 'comment-created':
          await mongoose.model('Notification').create({
            recipient: data.authorId,
            sender: data.userId,
            type: 'comment',
            content: `${data.userName} commented on your content`,
            reference: {
              type: 'content',
              id: data.contentId
            }
          });
          break;

        case 'comment-replied':
          await mongoose.model('Notification').create({
            recipient: data.commentAuthorId,
            sender: data.userId,
            type: 'reply',
            content: `${data.userName} replied to your comment`,
            reference: {
              type: 'comment',
              id: data.commentId
            }
          });
          break;

        case 'user-mentioned':
          await mongoose.model('Notification').create({
            recipient: data.mentionedUserId,
            sender: data.userId,
            type: 'mention',
            content: `${data.userName} mentioned you in a comment`,
            reference: {
              type: 'comment',
              id: data.commentId
            }
          });
          break;
      }

      // Clear related caches
      await redisClient.del(`notifications:user:${data.recipientId}`);
      await redisClient.del(`notifications:unread:${data.recipientId}`);
    }
  });
};

runConsumer().catch(console.error);

// Routes
app.use('/api/notifications', notificationRoutes);

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

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Notification service is running on port ${PORT}`);
}); 
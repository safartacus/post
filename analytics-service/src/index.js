require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Kafka } = require('kafkajs');
const Redis = require('redis');
const moment = require('moment');
const cron = require('node-cron');

const analyticsRoutes = require('./routes/analyticsRoutes');

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
  clientId: 'analytics-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const consumer = kafka.consumer({ groupId: 'analytics-service-group' });

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ 
    topics: [
      'content-viewed',
      'content-liked',
      'content-commented',
      'content-shared',
      'user-followed',
      'search-performed',
      'link-clicked'
    ] 
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());

      // Create analytics event based on topic
      const analyticsEvent = {
        type: topic.split('-')[1],
        userId: data.userId,
        contentId: data.contentId,
        categoryId: data.categoryId,
        metadata: {
          device: data.device,
          browser: data.browser,
          os: data.os,
          country: data.country,
          city: data.city,
          referrer: data.referrer,
          searchQuery: data.searchQuery,
          duration: data.duration,
          page: data.page,
          section: data.section
        },
        timestamp: new Date()
      };

      // Save to MongoDB
      await mongoose.model('Analytics').create(analyticsEvent);

      // Clear related caches
      const cacheKeys = [
        `analytics:user:${data.userId}`,
        `analytics:content:${data.contentId}`,
        `analytics:category:${data.categoryId}`
      ].filter(Boolean);

      await Promise.all(cacheKeys.map(key => redisClient.del(key)));
    }
  });
};

runConsumer().catch(console.error);

// Schedule daily analytics aggregation
cron.schedule('0 0 * * *', async () => {
  try {
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    
    // Aggregate daily analytics
    const dailyAnalytics = await mongoose.model('Analytics').aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(yesterday),
            $lt: new Date(moment(yesterday).add(1, 'days'))
          }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            contentId: '$contentId',
            categoryId: '$categoryId'
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          totalDuration: { $sum: '$metadata.duration' }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id.type',
          contentId: '$_id.contentId',
          categoryId: '$_id.categoryId',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          totalDuration: 1
        }
      }
    ]);

    // Send aggregated data to Kafka
    await producer.send({
      topic: 'analytics-daily-aggregation',
      messages: [
        { value: JSON.stringify({ date: yesterday, data: dailyAnalytics }) }
      ]
    });

    console.log(`Daily analytics aggregation completed for ${yesterday}`);
  } catch (error) {
    console.error('Error in daily analytics aggregation:', error);
  }
});

// Routes
app.use('/api/analytics', analyticsRoutes);

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

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Analytics service is running on port ${PORT}`);
}); 
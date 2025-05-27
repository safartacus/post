const Analytics = require('../models/Analytics');
const { Kafka } = require('kafkajs');
const Redis = require('redis');
const moment = require('moment');
const cron = require('node-cron');

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'analytics-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL
});

redis.connect().catch(console.error);

// Track analytics event
exports.trackEvent = async (req, res) => {
  try {
    const {
      type,
      userId,
      contentId,
      categoryId,
      metadata
    } = req.body;

    const analytics = new Analytics({
      type,
      userId,
      contentId,
      categoryId,
      metadata,
      timestamp: new Date()
    });

    await analytics.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'analytics-tracked',
      messages: [
        { value: JSON.stringify(analytics) }
      ]
    });

    // Clear related caches
    const cacheKeys = [
      `analytics:user:${userId}`,
      `analytics:content:${contentId}`,
      `analytics:category:${categoryId}`
    ].filter(Boolean);

    await Promise.all(cacheKeys.map(key => redis.del(key)));

    res.status(201).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track analytics'
    });
  }
};

// Get user analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, type } = req.query;

    const cacheKey = `analytics:user:${userId}:${startDate}:${endDate}:${type}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        data: JSON.parse(cachedData)
      });
    }

    const query = { userId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (type) query.type = type;

    const analytics = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .lean();

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(analytics), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user analytics'
    });
  }
};

// Get content analytics
exports.getContentAnalytics = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { startDate, endDate, type } = req.query;

    const cacheKey = `analytics:content:${contentId}:${startDate}:${endDate}:${type}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        data: JSON.parse(cachedData)
      });
    }

    const query = { contentId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (type) query.type = type;

    const analytics = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .lean();

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(analytics), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting content analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content analytics'
    });
  }
};

// Get category analytics
exports.getCategoryAnalytics = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { startDate, endDate, type } = req.query;

    const cacheKey = `analytics:category:${categoryId}:${startDate}:${endDate}:${type}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        data: JSON.parse(cachedData)
      });
    }

    const query = { categoryId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (type) query.type = type;

    const analytics = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .lean();

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(analytics), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting category analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get category analytics'
    });
  }
};

// Get aggregated analytics
exports.getAggregatedAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, type, groupBy } = req.query;

    const cacheKey = `analytics:aggregated:${startDate}:${endDate}:${type}:${groupBy}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        data: JSON.parse(cachedData)
      });
    }

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }
    if (type) matchStage.type = type;

    const groupStage = {
      _id: `$${groupBy}`,
      count: { $sum: 1 },
      uniqueUsers: { $addToSet: '$userId' }
    };

    const analytics = await Analytics.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $project: {
        _id: 1,
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }}
    ]);

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(analytics), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting aggregated analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get aggregated analytics'
    });
  }
};

// Get platform analytics
const getPlatformAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const analytics = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            platform: '$platform',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          platforms: {
            $push: {
              platform: '$_id.platform',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get location analytics
const getLocationAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const analytics = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            country: '$location.country',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          countries: {
            $push: {
              country: '$_id.country',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Schedule daily analytics aggregation
cron.schedule('0 0 * * *', async () => {
  try {
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    
    // Aggregate daily content analytics
    const contentAnalytics = await Analytics.aggregate([
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
            contentId: '$contentId',
            type: '$type'
          },
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    // Send aggregated data to Kafka
    await producer.send({
      topic: 'analytics-daily-aggregation',
      messages: [
        { value: JSON.stringify({ date: yesterday, data: contentAnalytics }) }
      ]
    });
  } catch (error) {
    console.error('Error in daily analytics aggregation:', error);
  }
});
module.exports = {
  trackEvent: exports.trackEvent,
  getUserAnalytics: exports.getUserAnalytics,
  getContentAnalytics: exports.getContentAnalytics,
  getCategoryAnalytics: exports.getCategoryAnalytics,
  getAggregatedAnalytics: exports.getAggregatedAnalytics,
  getPlatformAnalytics,
  getLocationAnalytics
};

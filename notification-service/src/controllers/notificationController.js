const Notification = require('../models/Notification');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL
});

redis.connect().catch(console.error);

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const {
      recipient,
      sender,
      type,
      content,
      reference,
      metadata
    } = req.body;

    const notification = new Notification({
      recipient,
      sender,
      type,
      content,
      reference,
      metadata
    });

    await notification.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'notification-created',
      messages: [
        { value: JSON.stringify(notification) }
      ]
    });

    // Clear cache
    await redis.del(`notifications:user:${recipient}`);

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
};

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const userId = req.user.id;

    // Try to get from cache first
    const cacheKey = `notifications:user:${userId}:${page}:${limit}:${type || 'all'}`;
    const cachedNotifications = await redis.get(cacheKey);
    
    if (cachedNotifications) {
      return res.json({
        success: true,
        data: JSON.parse(cachedNotifications)
      });
    }

    const query = { recipient: userId };
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .lean();

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(notifications), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
};

// Mark notifications as read
exports.markAsRead = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: 'IDs must be an array'
      });
    }

    await Notification.updateMany(
      {
        _id: { $in: ids },
        recipient: userId
      },
      {
        isRead: true
      }
    );

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'notifications-read',
      messages: [
        { value: JSON.stringify({ userId, notificationIds: ids }) }
      ]
    });

    // Clear cache
    await redis.del(`notifications:user:${userId}`);

    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
};

// Delete notifications
exports.deleteNotifications = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: 'IDs must be an array'
      });
    }

    await Notification.deleteMany({
      _id: { $in: ids },
      recipient: userId
    });

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'notifications-deleted',
      messages: [
        { value: JSON.stringify({ userId, notificationIds: ids }) }
      ]
    });

    // Clear cache
    await redis.del(`notifications:user:${userId}`);

    res.json({
      success: true,
      message: 'Notifications deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notifications'
    });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Try to get from cache first
    const cacheKey = `notifications:unread:${userId}`;
    const cachedCount = await redis.get(cacheKey);
    
    if (cachedCount) {
      return res.json({
        success: true,
        data: { count: parseInt(cachedCount) }
      });
    }

    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    // Cache the result
    await redis.set(cacheKey, count.toString(), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  deleteNotifications,
  getUnreadCount
}; 
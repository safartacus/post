const User = require('../models/User');
const { Kafka } = require('kafkajs');
const Redis = require('redis');
const jwt = require('jsonwebtoken');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect().catch(console.error);

// Create new user
const createUser = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: {
          message: 'User already exists',
          code: 'USER_EXISTS'
        }
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      fullName
    });

    await user.save();

    // Send event to Kafka
    await producer.send({
      topic: 'user-created',
      messages: [
        { value: JSON.stringify(user) }
      ]
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `user:${id}`;

    // Try to get from cache
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      return res.json(JSON.parse(cachedUser));
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(user), {
      EX: 3600
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.status;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Check if user is authorized to update
    if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: {
          message: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        }
      });
    }

    Object.assign(user, updates);
    await user.save();

    // Clear cache
    await redis.del(`user:${id}`);

    // Send event to Kafka
    await producer.send({
      topic: 'user-updated',
      messages: [
        { value: JSON.stringify(user) }
      ]
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        bio: user.bio,
        avatar: user.avatar,
        socialLinks: user.socialLinks,
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Check if user is authorized to delete
    if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: {
          message: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        }
      });
    }

    await user.remove();

    // Clear cache
    await redis.del(`user:${id}`);

    // Send event to Kafka
    await producer.send({
      topic: 'user-deleted',
      messages: [
        { value: JSON.stringify({ id }) }
      ]
    });

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Follow user
const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user.id;

    if (id === followerId) {
      return res.status(400).json({
        error: {
          message: 'Cannot follow yourself',
          code: 'INVALID_OPERATION'
        }
      });
    }

    const user = await User.findById(id);
    const follower = await User.findById(followerId);

    if (!user || !follower) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Update follower counts
    user.stats.followers += 1;
    follower.stats.following += 1;

    await Promise.all([user.save(), follower.save()]);

    // Send event to Kafka
    await producer.send({
      topic: 'user-followed',
      messages: [
        { value: JSON.stringify({
          followerId,
          followingId: id
        }) }
      ]
    });

    res.json({
      message: 'Followed successfully',
      stats: {
        followers: user.stats.followers,
        following: follower.stats.following
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Unfollow user
const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user.id;

    if (id === followerId) {
      return res.status(400).json({
        error: {
          message: 'Cannot unfollow yourself',
          code: 'INVALID_OPERATION'
        }
      });
    }

    const user = await User.findById(id);
    const follower = await User.findById(followerId);

    if (!user || !follower) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Update follower counts
    user.stats.followers = Math.max(0, user.stats.followers - 1);
    follower.stats.following = Math.max(0, follower.stats.following - 1);

    await Promise.all([user.save(), follower.save()]);

    // Send event to Kafka
    await producer.send({
      topic: 'user-unfollowed',
      messages: [
        { value: JSON.stringify({
          followerId,
          followingId: id
        }) }
      ]
    });

    res.json({
      message: 'Unfollowed successfully',
      stats: {
        followers: user.stats.followers,
        following: follower.stats.following
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

module.exports = {
  createUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  followUser,
  unfollowUser
}; 
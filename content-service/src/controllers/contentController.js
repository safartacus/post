const Content = require('../models/Content');
const { Kafka } = require('kafkajs');
const Redis = require('redis');
const sanitizeHtml = require('sanitize-html');

const kafka = new Kafka({
  clientId: 'content-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect().catch(console.error);

// Create new content
const createContent = async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      media,
      category,
      tags,
      visibility,
      seo,
      schedule
    } = req.body;

    // Sanitize content
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'video']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title'],
        video: ['src', 'controls', 'width', 'height']
      }
    });

    const newContent = new Content({
      title,
      description,
      content: sanitizedContent,
      media,
      category,
      tags,
      visibility,
      seo,
      schedule,
      author: req.user.id
    });

    await newContent.save();

    // Send event to Kafka
    await producer.send({
      topic: 'content-created',
      messages: [
        { value: JSON.stringify(newContent) }
      ]
    });

    res.status(201).json({
      message: 'Content created successfully',
      content: newContent
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

// Get content by ID or slug
const getContent = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `content:${id}`;

    // Try to get from cache
    const cachedContent = await redis.get(cacheKey);
    if (cachedContent) {
      return res.json(JSON.parse(cachedContent));
    }

    const content = await Content.findById(id)
      .populate('author', 'username fullName avatar')
      .populate('category', 'name slug');

    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'CONTENT_NOT_FOUND'
        }
      });
    }

    // Check visibility
    if (content.visibility === 'private' && content.author._id.toString() !== req.user.id) {
      return res.status(403).json({
        error: {
          message: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        }
      });
    }

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(content), {
      EX: 3600
    });

    // Increment view count
    content.stats.views += 1;
    await content.save();

    res.json(content);
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Update content
const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'CONTENT_NOT_FOUND'
        }
      });
    }

    // Check if user is authorized to update
    if (content.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: {
          message: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        }
      });
    }

    // Sanitize content if provided
    if (updates.content) {
      updates.content = sanitizeHtml(updates.content, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'video']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title'],
          video: ['src', 'controls', 'width', 'height']
        }
      });
    }

    Object.assign(content, updates);
    await content.save();

    // Clear cache
    await redis.del(`content:${id}`);

    // Send event to Kafka
    await producer.send({
      topic: 'content-updated',
      messages: [
        { value: JSON.stringify(content) }
      ]
    });

    res.json({
      message: 'Content updated successfully',
      content
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

// Delete content
const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'CONTENT_NOT_FOUND'
        }
      });
    }

    // Check if user is authorized to delete
    if (content.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: {
          message: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        }
      });
    }

    await content.remove();

    // Clear cache
    await redis.del(`content:${id}`);

    // Send event to Kafka
    await producer.send({
      topic: 'content-deleted',
      messages: [
        { value: JSON.stringify({ id }) }
      ]
    });

    res.json({
      message: 'Content deleted successfully'
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

// List content with filters
const listContent = async (req, res) => {
  try {
    const {
      author,
      category,
      tag,
      status,
      visibility,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (author) query.author = author;
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (status) query.status = status;
    if (visibility) query.visibility = visibility;

    const skip = (page - 1) * limit;

    const [contents, total] = await Promise.all([
      Content.find(query)
        .populate('author', 'username fullName avatar')
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Content.countDocuments(query)
    ]);

    res.json({
      contents,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
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

// Like content
const likeContent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'CONTENT_NOT_FOUND'
        }
      });
    }

    // Increment like count
    content.stats.likes += 1;
    await content.save();

    // Send event to Kafka
    await producer.send({
      topic: 'content-liked',
      messages: [
        { value: JSON.stringify({
          contentId: id,
          userId
        }) }
      ]
    });

    res.json({
      message: 'Content liked successfully',
      stats: content.stats
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

// Unlike content
const unlikeContent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        error: {
          message: 'Content not found',
          code: 'CONTENT_NOT_FOUND'
        }
      });
    }

    // Decrement like count
    content.stats.likes = Math.max(0, content.stats.likes - 1);
    await content.save();

    // Send event to Kafka
    await producer.send({
      topic: 'content-unliked',
      messages: [
        { value: JSON.stringify({
          contentId: id,
          userId
        }) }
      ]
    });

    res.json({
      message: 'Content unliked successfully',
      stats: content.stats
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
  createContent,
  getContent,
  updateContent,
  deleteContent,
  listContent,
  likeContent,
  unlikeContent
}; 
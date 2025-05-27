const Comment = require('../models/Comment');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'comment-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect().catch(console.error);

// Create a new comment
exports.createComment = async (req, res) => {
  try {
    const {
      content,
      contentId,
      parent,
      metadata
    } = req.body;

    const comment = new Comment({
      content,
      contentId,
      parent,
      author: req.user.id,
      metadata
    });

    await comment.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'comment-created',
      messages: [
        { value: JSON.stringify(comment) }
      ]
    });

    // Clear cache
    await redis.del(`comments:content:${contentId}`);
    if (parent) {
      await redis.del(`comments:parent:${parent}`);
    }

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
};

// Get comments for content
exports.getContentComments = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt' } = req.query;

    // Try to get from cache first
    const cacheKey = `comments:content:${contentId}:${page}:${limit}:${sort}`;
    const cachedComments = await redis.get(cacheKey);
    
    if (cachedComments) {
      return res.json({
        success: true,
        data: JSON.parse(cachedComments)
      });
    }

    const comments = await Comment.find({
      contentId,
      parent: null,
      isDeleted: false
    })
      .sort({ [sort]: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('author', 'username avatar')
      .populate({
        path: 'stats',
        select: 'likes replies'
      });

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(comments), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
};

// Get replies for a comment
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Try to get from cache first
    const cacheKey = `comments:parent:${commentId}:${page}:${limit}`;
    const cachedReplies = await redis.get(cacheKey);
    
    if (cachedReplies) {
      return res.json({
        success: true,
        data: JSON.parse(cachedReplies)
      });
    }

    const replies = await Comment.find({
      parent: commentId,
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('author', 'username avatar')
      .populate({
        path: 'stats',
        select: 'likes replies'
      });

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(replies), {
      EX: 300 // Cache for 5 minutes
    });

    res.json({
      success: true,
      data: replies
    });
  } catch (error) {
    console.error('Error getting replies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get replies'
    });
  }
};

// Update comment
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, metadata } = req.body;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this comment'
      });
    }

    // Update fields
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    if (metadata) {
      comment.metadata = metadata;
    }

    await comment.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'comment-updated',
      messages: [
        { value: JSON.stringify(comment) }
      ]
    });

    // Clear cache
    await redis.del(`comments:content:${comment.contentId}`);
    if (comment.parent) {
      await redis.del(`comments:parent:${comment.parent}`);
    }

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this comment'
      });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    await comment.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'comment-deleted',
      messages: [
        { value: JSON.stringify({ id: comment._id }) }
      ]
    });

    // Clear cache
    await redis.del(`comments:content:${comment.contentId}`);
    if (comment.parent) {
      await redis.del(`comments:parent:${comment.parent}`);
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
};

// Like/Unlike comment
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user has already liked the comment
    const hasLiked = await redis.sismember(`comment:${id}:likes`, userId);

    if (hasLiked) {
      // Unlike
      await redis.srem(`comment:${id}:likes`, userId);
      comment.stats.likes--;
    } else {
      // Like
      await redis.sadd(`comment:${id}:likes`, userId);
      comment.stats.likes++;
    }

    await comment.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: hasLiked ? 'comment-unliked' : 'comment-liked',
      messages: [
        { value: JSON.stringify({ commentId: id, userId }) }
      ]
    });

    // Clear cache
    await redis.del(`comments:content:${comment.contentId}`);
    if (comment.parent) {
      await redis.del(`comments:parent:${comment.parent}`);
    }

    res.json({
      success: true,
      data: {
        likes: comment.stats.likes,
        hasLiked: !hasLiked
      }
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like'
    });
  }
};
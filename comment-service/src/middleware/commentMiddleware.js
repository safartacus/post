const Comment = require('../models/Comment');

const checkCommentOwnership = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Admin can do anything
    if (req.user.role === 'admin') {
      req.comment = comment;
      return next();
    }

    // Author can only manage their own comments
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to perform this action' });
    }

    req.comment = comment;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const validateCommentStatus = (allowedStatuses) => {
  return (req, res, next) => {
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    next();
  };
};

module.exports = {
  checkCommentOwnership,
  validateCommentStatus
}; 
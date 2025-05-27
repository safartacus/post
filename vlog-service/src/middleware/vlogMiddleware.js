const Vlog = require('../models/Vlog');

const checkVlogOwnership = async (req, res, next) => {
  try {
    const vlog = await Vlog.findById(req.params.id);
    
    if (!vlog) {
      return res.status(404).json({ error: 'Vlog not found' });
    }

    // Admin can do anything
    if (req.user.role === 'admin') {
      req.vlog = vlog;
      return next();
    }

    // Author can only manage their own vlogs
    if (vlog.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to perform this action' });
    }

    req.vlog = vlog;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkPublishPermission = async (req, res, next) => {
  try {
    // Admin and author can publish directly
    if (['admin', 'author'].includes(req.user.role)) {
      return next();
    }

    // Regular users need approval
    req.body.status = 'pending';
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const validateVlogStatus = (allowedStatuses) => {
  return (req, res, next) => {
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    next();
  };
};

module.exports = {
  checkVlogOwnership,
  checkPublishPermission,
  validateVlogStatus
}; 
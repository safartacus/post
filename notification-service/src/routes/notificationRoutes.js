const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createNotification,
  getUserNotifications,
  markAsRead,
  deleteNotifications,
  getUnreadCount
} = require('../controllers/notificationController');

// Validation middleware
const validateNotification = [
  body('recipient')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  body('sender')
    .optional()
    .isMongoId()
    .withMessage('Invalid sender ID'),
  body('type')
    .isIn(['follow', 'like', 'comment', 'reply', 'mention', 'system'])
    .withMessage('Invalid notification type'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Content must be between 1 and 500 characters'),
  body('reference')
    .optional()
    .isObject()
    .withMessage('Reference must be an object'),
  body('reference.type')
    .optional()
    .isIn(['content', 'comment', 'user'])
    .withMessage('Invalid reference type'),
  body('reference.id')
    .optional()
    .isMongoId()
    .withMessage('Invalid reference ID'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['follow', 'like', 'comment', 'reply', 'mention', 'system'])
    .withMessage('Invalid notification type')
];

// Routes
router.post('/',
  auth,
  validateNotification,
  createNotification
);

router.get('/',
  auth,
  validatePagination,
  getUserNotifications
);

router.post('/read',
  auth,
  body('ids')
    .isArray()
    .withMessage('IDs must be an array')
    .notEmpty()
    .withMessage('IDs array cannot be empty'),
  body('ids.*')
    .isMongoId()
    .withMessage('Invalid notification ID'),
  markAsRead
);

router.delete('/',
  auth,
  body('ids')
    .isArray()
    .withMessage('IDs must be an array')
    .notEmpty()
    .withMessage('IDs array cannot be empty'),
  body('ids.*')
    .isMongoId()
    .withMessage('Invalid notification ID'),
  deleteNotifications
);

router.get('/unread/count',
  auth,
  getUnreadCount
);

module.exports = router; 
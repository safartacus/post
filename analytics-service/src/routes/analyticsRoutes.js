const express = require('express');
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  trackEvent,
  getUserAnalytics,
  getContentAnalytics,
  getCategoryAnalytics,
  getAggregatedAnalytics,
  getPlatformAnalytics,
  getLocationAnalytics
} = require('../controllers/analyticsController');

const router = express.Router();

// Validation middleware
const validateAnalyticsEvent = [
  body('type')
    .isIn(['view', 'like', 'comment', 'share', 'follow', 'search', 'click'])
    .withMessage('Invalid event type'),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('contentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid content ID'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  body('metadata.device')
    .optional()
    .isIn(['desktop', 'mobile', 'tablet'])
    .withMessage('Invalid device type'),
  body('metadata.browser')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Browser must not exceed 100 characters'),
  body('metadata.os')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('OS must not exceed 100 characters'),
  body('metadata.country')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  body('metadata.city')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),
  body('metadata.referrer')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Referrer must not exceed 500 characters'),
  body('metadata.searchQuery')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query must not exceed 200 characters'),
  body('metadata.duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number'),
  body('metadata.page')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Page must not exceed 200 characters'),
  body('metadata.section')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Section must not exceed 100 characters')
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (endDate && req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const validateAnalyticsType = [
  query('type')
    .optional()
    .isIn(['view', 'like', 'comment', 'share', 'follow', 'search', 'click'])
    .withMessage('Invalid analytics type')
];

const validateGroupBy = [
  query('groupBy')
    .optional()
    .isIn(['type', 'userId', 'contentId', 'categoryId', 'metadata.device', 'metadata.country'])
    .withMessage('Invalid group by field')
];

// Routes
router.post('/track',
  auth,
  validateAnalyticsEvent,
  trackEvent
);

router.get('/user/:userId',
  auth,
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  validateDateRange,
  validateAnalyticsType,
  getUserAnalytics
);

router.get('/content/:contentId',
  auth,
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
  validateDateRange,
  validateAnalyticsType,
  getContentAnalytics
);

router.get('/category/:categoryId',
  auth,
  param('categoryId')
    .isMongoId()
    .withMessage('Invalid category ID'),
  validateDateRange,
  validateAnalyticsType,
  getCategoryAnalytics
);

router.get('/aggregated',
  auth,
  validateDateRange,
  validateAnalyticsType,
  validateGroupBy,
  getAggregatedAnalytics
);

router.get('/platform',
  auth,
  validateDateRange,
  getPlatformAnalytics
);

router.get('/location',
  auth,
  validateDateRange,
  getLocationAnalytics
);

module.exports = router; 
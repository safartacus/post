const express = require('express');
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  search,
  indexDocument,
  updateIndex,
  deleteIndex
} = require('../controllers/searchController');

const router = express.Router();

// Validation middleware
const validateSearch = [
  query('query')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query is required'),
  query('type')
    .optional()
    .isIn(['content', 'user', 'category'])
    .withMessage('Invalid document type'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['relevance', 'newest', 'popular', 'trending'])
    .withMessage('Invalid sort option'),
  query('filters')
    .optional()
    .isJSON()
    .withMessage('Filters must be a valid JSON object')
];

const validateIndex = [
  body('type')
    .isIn(['content', 'user', 'category'])
    .withMessage('Invalid document type'),
  body('documentId')
    .isMongoId()
    .withMessage('Invalid document ID'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Content must not exceed 10000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  body('metadata.author')
    .optional()
    .isMongoId()
    .withMessage('Invalid author ID'),
  body('metadata.category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('metadata.status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  body('metadata.visibility')
    .optional()
    .isIn(['public', 'private', 'followers'])
    .withMessage('Invalid visibility')
];

// Routes
router.get('/',
  validateSearch,
  search
);

router.post('/index',
  auth,
  validateIndex,
  indexDocument
);

router.patch('/index/:id',
  auth,
  param('id')
    .isMongoId()
    .withMessage('Invalid index ID'),
  validateIndex,
  updateIndex
);

router.delete('/index/:id',
  auth,
  param('id')
    .isMongoId()
    .withMessage('Invalid index ID'),
  deleteIndex
);

module.exports = router; 
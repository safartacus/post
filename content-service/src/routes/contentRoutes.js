const express = require('express');
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  createContent,
  getContent,
  updateContent,
  deleteContent,
  listContent,
  likeContent,
  unlikeContent
} = require('../controllers/contentController');

const router = express.Router();

// Validation middleware
const validateContent = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'draft'])
    .withMessage('Invalid visibility value'),
  body('seo')
    .optional()
    .isObject()
    .withMessage('SEO must be an object'),
  body('schedule')
    .optional()
    .isObject()
    .withMessage('Schedule must be an object')
];

const validateListQuery = [
  query('author')
    .optional()
    .isMongoId()
    .withMessage('Invalid author ID'),
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  query('tag')
    .optional()
    .isString()
    .withMessage('Invalid tag'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  query('visibility')
    .optional()
    .isIn(['public', 'private', 'draft'])
    .withMessage('Invalid visibility'),
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
    .isString()
    .withMessage('Invalid sort parameter')
];

// Routes
router.post('/', auth, validateContent, createContent);
router.get('/:id', auth, param('id').isMongoId().withMessage('Invalid content ID'), getContent);
router.patch('/:id', auth, param('id').isMongoId().withMessage('Invalid content ID'), validateContent, updateContent);
router.delete('/:id', auth, param('id').isMongoId().withMessage('Invalid content ID'), deleteContent);
router.get('/', auth, validateListQuery, listContent);
router.post('/:id/like', auth, param('id').isMongoId().withMessage('Invalid content ID'), likeContent);
router.post('/:id/unlike', auth, param('id').isMongoId().withMessage('Invalid content ID'), unlikeContent);

module.exports = router; 
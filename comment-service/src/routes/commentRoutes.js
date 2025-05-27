const express = require('express');
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  checkCommentOwnership,
  validateCommentStatus
} = require('../middleware/commentMiddleware');
const {
  createComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
  likeComment
} = require('../controllers/commentController');

const router = express.Router();

// Validation middleware
const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  body('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID'),
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
  query('sort')
    .optional()
    .isIn(['createdAt', 'stats.likes', 'stats.replies'])
    .withMessage('Invalid sort field')
];

// Routes
router.post('/',
  auth,
  validateComment,
  createComment
);

router.get('/content/:contentId',
  param('contentId').isMongoId().withMessage('Invalid content ID'),
  validatePagination,
  getComments
);

router.get('/:commentId/replies',
  param('commentId').isMongoId().withMessage('Invalid comment ID'),
  validatePagination,
  getComment
);

router.patch('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid comment ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  updateComment
);

router.delete('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid comment ID'),
  deleteComment
);

router.post('/:id/like',
  auth,
  param('id').isMongoId().withMessage('Invalid comment ID'),
  likeComment
);

module.exports = router; 
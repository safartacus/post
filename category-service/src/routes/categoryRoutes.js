const express = require('express');
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  checkCategoryOwnership,
  validateCategoryStatus,
  checkCircularReference
} = require('../middleware/categoryMiddleware');
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
} = require('../controllers/categoryController');

const router = express.Router();

// Validation middleware
const validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string'),
  body('image')
    .optional()
    .isString()
    .withMessage('Image must be a string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Routes
router.post('/',
  auth,
  validateCategory,
  checkCircularReference,
  createCategory
);

router.get('/',
  query('includeInactive').optional().isBoolean(),
  getCategories
);

router.get('/tree',
  getCategoryTree
);

router.get('/:id',
  param('id').isMongoId().withMessage('Invalid category ID'),
  getCategory
);

router.patch('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid category ID'),
  validateCategory,
  checkCircularReference,
  updateCategory
);

router.delete('/:id',
  auth,
  param('id').isMongoId().withMessage('Invalid category ID'),
  deleteCategory
);

module.exports = router; 
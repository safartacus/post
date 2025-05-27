const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  checkVlogOwnership,
  checkPublishPermission,
  validateVlogStatus
} = require('../middleware/vlogMiddleware');
const {
  createVlog,
  getVlogs,
  getVlog,
  updateVlog,
  deleteVlog,
  likeVlog,
  approveVlog,
  rejectVlog
} = require('../controllers/vlogController');

const router = express.Router();

// Validation middleware
const vlogValidation = [
  body('title')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Title must be at least 3 characters long'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
];

// Routes
router.post('/', auth, vlogValidation, checkPublishPermission, createVlog);
router.get('/', auth, getVlogs);
router.get('/:id', auth, getVlog);
router.put('/:id', auth, checkVlogOwnership, vlogValidation, updateVlog);
router.delete('/:id', auth, checkVlogOwnership, deleteVlog);
router.post('/:id/like', auth, likeVlog);

// Admin routes
router.post('/:id/approve', auth, checkVlogOwnership, approveVlog);
router.post('/:id/reject', auth, checkVlogOwnership, rejectVlog);

module.exports = router; 
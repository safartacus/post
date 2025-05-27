const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  followUser,
  unfollowUser
} = require('../controllers/userController');

// Validation middleware
const validateCreateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
];

const validateUpdateProfile = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('socialLinks.*')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid social media URL'),
  body('preferences.*')
    .optional()
    .isBoolean()
    .withMessage('Invalid preference value')
];

// Routes
router.post('/', validateCreateUser, createUser);
router.get('/:id', auth, getUserProfile);
router.patch('/:id', auth, validateUpdateProfile, updateUserProfile);
router.delete('/:id', auth, deleteUser);
router.post('/:id/follow', auth, followUser);
router.post('/:id/unfollow', auth, unfollowUser);

module.exports = router; 
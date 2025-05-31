const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getUploadUrl,
  processMedia,
  getMediaInfo,
  deleteMedia,
  updateMedia
} = require('../controllers/mediaController');

// Validation middleware
const validateUploadRequest = [
  body('type').isIn(['image', 'video', 'audio']).withMessage('Invalid media type'),
  body('originalName').notEmpty().withMessage('Original filename is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
];

const validateProcessRequest = [
  body('type').isIn(['image', 'video', 'audio']).withMessage('Invalid media type'),
  body('key').notEmpty().withMessage('File key is required'),
  body('bucket').notEmpty().withMessage('Bucket name is required'),
  body('originalName').notEmpty().withMessage('Original filename is required'),
  body('mimeType').notEmpty().withMessage('MIME type is required'),
  body('size').isNumeric().withMessage('File size must be a number'),
  body('mediaId').isMongoId().withMessage('Invalid media ID')
];

const validateUpdateRequest = [
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
];

// Routes
router.post('/upload-url', auth, validateUploadRequest, getUploadUrl);
router.post('/process', auth, validateProcessRequest, processMedia);
router.get('/:id', auth, getMediaInfo);
router.delete('/:id', auth, deleteMedia);
router.patch('/:id', auth, validateUpdateRequest, updateMedia);


module.exports = router; 
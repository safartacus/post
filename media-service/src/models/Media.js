const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true
  },
  bucket: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    format: String,
    bitrate: Number,
    codec: String,
    fps: Number,
    channels: Number,
    sampleRate: Number
  },
  thumbnail: {
    bucket: String,
    key: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing'
  },
  error: {
    message: String,
    code: String
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
mediaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
mediaSchema.index({ owner: 1, type: 1 });
mediaSchema.index({ bucket: 1, key: 1 });
mediaSchema.index({ status: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ isPublic: 1 });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema); 
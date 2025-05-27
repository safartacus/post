const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['view', 'like', 'comment', 'share', 'follow', 'search', 'click'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },
  metadata: {
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      index: true
    },
    browser: String,
    os: String,
    country: String,
    city: String,
    referrer: String,
    searchQuery: String,
    duration: Number,
    page: String,
    section: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ contentId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ categoryId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ 'metadata.device': 1, type: 1, timestamp: -1 });
analyticsSchema.index({ 'metadata.country': 1, type: 1, timestamp: -1 });

// TTL index to automatically delete analytics older than 1 year
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics; 
const mongoose = require('mongoose');

const searchIndexSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['content', 'user', 'category'],
    index: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    index: true
  },
  content: {
    type: String,
    index: true
  },
  tags: [{
    type: String,
    index: true
  }],
  metadata: {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'followers'],
      default: 'public',
      index: true
    },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 }
    },
    publishedAt: {
      type: Date,
      index: true
    }
  },
  searchVector: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
searchIndexSchema.index({ type: 1, 'metadata.status': 1, 'metadata.visibility': 1 });
searchIndexSchema.index({ type: 1, 'metadata.author': 1, createdAt: -1 });
searchIndexSchema.index({ type: 1, 'metadata.category': 1, createdAt: -1 });
searchIndexSchema.index({ type: 1, tags: 1, createdAt: -1 });
searchIndexSchema.index({ type: 1, 'metadata.stats.views': -1 });
searchIndexSchema.index({ type: 1, 'metadata.stats.likes': -1 });
searchIndexSchema.index({ type: 1, 'metadata.stats.comments': -1 });

// Text index for full-text search
searchIndexSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    content: 3,
    tags: 4
  },
  name: 'text_search'
});

// Pre-save hook to generate search vector
searchIndexSchema.pre('save', function(next) {
  this.searchVector = [
    this.title,
    this.description,
    this.content,
    ...this.tags
  ].filter(Boolean).join(' ').toLowerCase();
  next();
});

const SearchIndex = mongoose.model('SearchIndex', searchIndexSchema);

module.exports = SearchIndex; 
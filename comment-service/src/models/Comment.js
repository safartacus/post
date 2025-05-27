const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  path: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deletedAt: {
    type: Date
  },
  stats: {
    likes: {
      type: Number,
      default: 0
    },
    replies: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Update level and path when parent changes
commentSchema.pre('save', async function(next) {
  if (this.isModified('parent')) {
    if (this.parent) {
      const parentComment = await this.constructor.findById(this.parent);
      if (parentComment) {
        this.level = parentComment.level + 1;
        this.path = [...parentComment.path, this.parent];
      }
    } else {
      this.level = 0;
      this.path = [];
    }
  }
  next();
});

// Update reply count when a reply is added
commentSchema.post('save', async function() {
  if (this.parent) {
    await this.constructor.findByIdAndUpdate(
      this.parent,
      { $inc: { 'stats.replies': 1 } }
    );
  }
});

// Update reply count when a reply is deleted
commentSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.parent) {
    await this.model.findByIdAndUpdate(
      doc.parent,
      { $inc: { 'stats.replies': -1 } }
    );
  }
});

// Indexes for better query performance
commentSchema.index({ contentId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parent: 1, createdAt: -1 });
commentSchema.index({ path: 1 });
commentSchema.index({ level: 1 });
commentSchema.index({ isDeleted: 1 });
commentSchema.index({ 'stats.likes': -1 });
commentSchema.index({ 'stats.replies': -1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 
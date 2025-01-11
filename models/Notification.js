const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['article_like', 'article_collect', 'article_comment', 'comment_like', 'comment_reply'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  target: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  targetType: {
    type: String,
    enum: ['Article', 'Comment'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema); 
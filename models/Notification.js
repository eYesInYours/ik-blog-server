const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 通知类型
  action: {
    type: String,
    enum: ['article_like', 'article_collect', 'article_comment', 'comment_like', 'comment_reply'],
    required: true
  },
  // 发送者
  sender: {
    // 发送者的数据Id，比如具体的评论Id
    _id: mongoose.Schema.Types.ObjectId,
    author: {
      _id: mongoose.Schema.Types.ObjectId,
      username: String,
      avatar: String
    },
    content: String  // 发送者的操作内容（比如评论内容）
  },
  // 接收者
  recipient: {
    // 接收者的数据Id，比如具体的评论Id
    _id: mongoose.Schema.Types.ObjectId,
    content: String,
    author: {
      _id: mongoose.Schema.Types.ObjectId,
      username: String,
      avatar: String
    },
  },
  // 目标Id：文章、日记的Id
  targetId: mongoose.Schema.Types.ObjectId,
  // 目标类型：文章、日记
  targetType: {
    type: String,
    enum: ['Article', 'Diary', 'Comment'],
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
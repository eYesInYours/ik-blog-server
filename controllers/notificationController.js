const Notification = require('../models/Notification');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');
const chalk = require('chalk');
const { NOTIFICATION_TYPES, NOTIFICATION_ACTIONS } = require('../constants/notificationTypes');
const Comment = require('../models/Comment');
const User = require('../models/User');

// 创建评论通知
exports.createCommentNotification = async (comment, article) => {
  try {
    const notification = new Notification({
      action: NOTIFICATION_ACTIONS.ARTICLE_COMMENT,
      sender: {
        _id: comment._id,
        author: {
          _id: comment.author._id,
          username: comment.author.username,
          avatar: comment.author.avatar
        },
        content: comment.content
      },
      recipient: {
        _id: article._id,
        content: article.title,
        author: {
          _id: article.author._id,
          username: article.author.username,
          avatar: article.author.avatar
        }
      },
      targetId: article._id,
      targetType: 'Article'
    });

    return await notification.save();
  } catch (err) {
    console.error('Error creating comment notification:', err);
    throw err;
  }
};

// 创建回复通知
exports.createReplyNotification = async (reply, parentComment) => {
  try {
    const notification = new Notification({
      action: NOTIFICATION_ACTIONS.COMMENT_REPLY,
      sender: {
        _id: reply._id,
        author: {
          _id: reply.author._id,
          username: reply.author.username,
          avatar: reply.author.avatar
        },
        content: reply.content
      },
      recipient: {
        _id: parentComment._id,
        content: parentComment.content,
        author: {
          _id: parentComment.author._id,
          username: parentComment.author.username,
          avatar: parentComment.author.avatar
        }
      },
      targetId: parentComment.targetId,
      targetType: parentComment.targetType
    });

    return await notification.save();
  } catch (err) {
    console.error('Error creating reply notification:', err);
    throw err;
  }
};

// 获取用户的通知列表
exports.getNotifications = async (req, res) => {
  try {
    const query = {
      'recipient.author._id': req.user._id,
      ...(req.query.isRead !== undefined && { isRead: req.query.isRead !== 'false' })
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(success({
      notifications,
    }));
  } catch (err) {
    console.error('获取通知列表失败:', err);
    res.status(SERVER_ERROR.INTERNAL_ERROR).json(
      error(SERVER_ERROR.INTERNAL_ERROR, '获取通知列表失败')
    );
  }
};

// 标记通知为已读
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, 'recipient.author._id': req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(CLIENT_ERROR.NOT_FOUND).json({
        message: '通知不存在'
      });
    }

    res.json({
      code: SUCCESS.OK,
      message: '标记成功',
      data: notification
    });
  } catch (error) {
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({
      message: '标记通知失败'
    });
  }
};

// 标记所有通知为已读
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { 'recipient.author._id': req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({
      code: SUCCESS.OK,
      message: '所有通知已标记为已读'
    });
  } catch (error) {
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({
      message: '标记通知失败'
    });
  }
};

// 创建文章点赞通知
exports.createArticleLikeNotification = async (user, article) => {
  try {
    const notification = new Notification({
      action: NOTIFICATION_ACTIONS.ARTICLE_LIKE,
      sender: {
        _id: user._id,
        author: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar
        }
      },
      recipient: {
        _id: article._id,
        content: article.title,
        author: {
          _id: article.author._id,
          username: article.author.username,
          avatar: article.author.avatar
        }
      },
      targetId: article._id,
      targetType: 'Article'
    });

    return await notification.save();
  } catch (err) {
    console.error('Error creating article like notification:', err);
    throw err;
  }
};

// 创建文章收藏通知
exports.createArticleCollectNotification = async (article, userId) => {
    try {
        const user = await User.findById(userId);
        const notification = new Notification({
            action: NOTIFICATION_ACTIONS.ARTICLE_COLLECT,
            sender: {
                _id: user._id,
                author: {
                    _id: user._id,
                    username: user.username,
                    avatar: user.avatar
                }
            },
            recipient: {
                _id: article._id,
                content: article.title,
                author: {
                    _id: article.author._id,
                    username: article.author.username,
                    avatar: article.author.avatar
                }
            },
            targetId: article._id,
            targetType: 'Article'
        });

        return await notification.save();
    } catch (err) {
        console.error('Error creating article collect notification:', err);
        throw err;
    }
};

// 创建评论点赞通知
exports.createCommentLikeNotification = async (user, comment) => {
  try {
    const notification = new Notification({
      action: NOTIFICATION_ACTIONS.COMMENT_LIKE,
      sender: {
        _id: user._id,
        author: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar
        }
      },
      recipient: {
        _id: comment._id,
        content: comment.content,
        author: {
          _id: comment.author._id,
          username: comment.author.username,
          avatar: comment.author.avatar
        }
      },
      targetId: comment._id,
      targetType: 'Comment'
    });

    return await notification.save();
  } catch (err) {
    console.error('Error creating like notification:', err);
    throw err;
  }
};

// 获取当前用户未读通知数
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            'recipient.author._id': req.user._id,
            isRead: false
        });

        res.json(success({
            count
        }));
    } catch (err) {
        console.error('获取未读通知数失败:', err);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取未读通知数失败')
        );
    }
}; 
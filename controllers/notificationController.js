const Notification = require('../models/Notification');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');
const chalk = require('chalk');
const { NOTIFICATION_TYPES, NOTIFICATION_ACTIONS } = require('../constants/notificationTypes');
const Comment = require('../models/Comment');

// 创建评论通知
exports.createCommentNotification = async (comment, article) => {
  try {
    console.log('Creating comment notification with data:', {
      comment: {
        _id: comment._id,
        author: comment.author,
        content: comment.content
      },
      article: {
        _id: article._id,
        author: article.author._id,
        title: article.title
      }
    });

    const notification = new Notification({
      recipient: article.author._id,
      sender: comment.author,
      type: NOTIFICATION_TYPES.ARTICLE_COMMENT,
      action: NOTIFICATION_ACTIONS.COMMENT_ARTICLE,
      target: comment._id,
      targetType: 'Comment'
    });

    const savedNotification = await notification.save();
    console.log('Comment notification created:', savedNotification);
    return savedNotification;
  } catch (err) {
    console.error('Error creating comment notification:', err);
    throw err;
  }
};

// 创建回复通知
exports.createReplyNotification = async (reply, parentComment) => {
  try {
    console.log('Creating reply notification with data:', {
      reply: {
        _id: reply._id,
        author: reply.author,
        content: reply.content
      },
      parentComment: {
        _id: parentComment._id,
        author: parentComment.author._id,
        content: parentComment.content
      }
    });

    const notification = new Notification({
      recipient: parentComment.author._id,
      sender: reply.author,
      type: NOTIFICATION_TYPES.COMMENT_REPLY,
      action: NOTIFICATION_ACTIONS.REPLY_COMMENT,
      target: {
        _id: reply._id,
        content: reply.content,
        author: reply.author,
        parentComment: {
          _id: parentComment._id,
          content: parentComment.content,
          author: parentComment.author
        }
      },
      targetType: 'Comment'
    });

    const savedNotification = await notification.save();
    console.log('Reply notification created:', savedNotification);
    return savedNotification;
  } catch (err) {
    console.error('Error creating reply notification:', err);
    throw err;
  }
};

// 获取用户的通知列表
exports.getNotifications = async (req, res) => {
  try {
    const query = {
      recipient: req.user._id,
      ...(req.query.isRead !== undefined && { isRead: req.query.isRead === 'false' ? false : true })
    };

    const notifications = await Notification.find(query)
      .populate('sender', 'username avatar')
      .populate({
        path: 'target',
        populate: [
          {
            path: 'author',
            select: 'username avatar'
          },
          {
            path: 'parentComment',
            select: 'content author',
            populate: {
              path: 'author',
              select: 'username avatar'
            }
          }
        ]
      })
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

// 获取默认动作描述
const getDefaultAction = (type, targetType) => {
  switch (type) {
    case 'reply':
      return NOTIFICATION_ACTIONS.REPLY_COMMENT;
    case 'comment':
      return NOTIFICATION_ACTIONS.COMMENT_ARTICLE;
    case 'like':
      return targetType === 'Article' 
        ? NOTIFICATION_ACTIONS.LIKE_ARTICLE 
        : NOTIFICATION_ACTIONS.LIKE_COMMENT;
    default:
      return '与你互动';
  }
};

// 标记通知为已读
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
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
      { recipient: req.user._id, isRead: false },
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
        console.log('Creating article like notification with data:', {
            user: user._id,
            article: {
                _id: article._id,
                author: article.author._id,
                title: article.title
            }
        });

        const notification = new Notification({
            recipient: article.author._id,
            sender: user._id,
            type: NOTIFICATION_TYPES.ARTICLE_LIKE,
            action: NOTIFICATION_ACTIONS.LIKE_ARTICLE,
            target: article._id,
            targetType: 'Article'
        });

        const savedNotification = await notification.save();
        console.log('Article like notification created:', savedNotification);
        return savedNotification;
    } catch (err) {
        console.error('Error creating article like notification:', err);
        throw err;
    }
};

// 创建文章收藏通知
exports.createArticleCollectNotification = async (user, article) => {
  try {
    const notification = new Notification({
      recipient: article.author,
      sender: user._id,
      type: NOTIFICATION_TYPES.ARTICLE_COLLECT,
      target: article._id,
      targetType: 'Article'
    });
    await notification.save();
  } catch (err) {
    console.error(chalk.red('创建收藏通知失败:'), err);
  }
};

// 创建评论点赞通知
exports.createCommentLikeNotification = async (user, comment) => {
    try {
        console.log('Creating comment like notification with data:', {
            user: user._id,
            comment: {
                _id: comment._id,
                author: comment.author._id,
                content: comment.content
            }
        });

        const notification = new Notification({
            recipient: comment.author._id,
            sender: user._id,
            type: NOTIFICATION_TYPES.COMMENT_LIKE,
            action: NOTIFICATION_ACTIONS.LIKE_COMMENT,
            target: comment._id,
            targetType: 'Comment'
        });

        const savedNotification = await notification.save();
        console.log('Comment like notification created:', savedNotification);
        return savedNotification;
    } catch (err) {
        console.error('Error creating comment like notification:', err);
        throw err;
    }
}; 
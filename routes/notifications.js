const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
} = require('../controllers/notificationController');

// 获取用户的通知列表
router.get('/', 
  auth,
  getNotifications
);

// 标记单个通知为已读
router.put('/:id/read',
  auth,
  markAsRead
);

// 标记所有通知为已读
router.put('/read-all',
  auth,
  markAllAsRead
);

// 获取未读通知数
router.get('/unread-count', auth, getUnreadCount);

module.exports = router; 
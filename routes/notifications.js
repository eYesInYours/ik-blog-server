const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// 获取用户的通知列表
router.get('/', 
  auth,
  notificationController.getNotifications
);

// 标记单个通知为已读
router.put('/:id/read',
  auth,
  notificationController.markAsRead
);

// 标记所有通知为已读
router.put('/read-all',
  auth,
  notificationController.markAllAsRead
);

module.exports = router; 
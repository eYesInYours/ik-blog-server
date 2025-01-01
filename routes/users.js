const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const authorGuard = require('../middleware/authorGuard');

// 获取用户信息（需要认证）
router.get('/info', auth, userController.getUserInfo);

// 更新用户信息（需要认证）
router.put('/update', auth, userController.updateUserInfo);

// 修改密码（需要认证）
router.put('/change-password', auth, userController.changePassword);

// 获取所有用户（管理接口）
router.get('/admin/all', auth, authorGuard, userController.getAllUsers);

// 禁用/启用用户（管理接口）
router.put('/admin/:userId/status', auth, authorGuard, userController.toggleUserStatus);

module.exports = router; 
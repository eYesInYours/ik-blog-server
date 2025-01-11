const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');

// 获取用户信息（需要认证）
router.get('/info', auth, userController.getUserInfo);

// 更新用户信息（需要认证）
router.put('/update', auth, userController.updateUserInfo);

// 修改密码（需要认证）
router.put('/change-password', auth, userController.changePassword);

// 获取所有用户（管理接口）
router.get('/admin/all', auth, authorOnly, userController.getAllUsers);

// 禁用/启用用户（管理接口）
router.put('/admin/:userId/status', auth, authorOnly, userController.toggleUserStatus);

// 获取作者信息（无需登录）
router.get('/author', userController.getAuthorInfo);

module.exports = router; 

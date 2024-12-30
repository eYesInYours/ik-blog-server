const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// 用户注册
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 验证令牌（需要认证）
router.get('/verify', auth, authController.verifyToken);

// 刷新令牌（需要认证）
router.post('/refresh', auth, authController.refreshToken);

// 退出登录（需要认证）
router.post('/logout', auth, authController.logout);

module.exports = router; 
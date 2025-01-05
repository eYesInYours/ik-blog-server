const express = require('express');
const router = express.Router();
const captchaController = require('../controllers/captchaController');

// 获取验证码
router.get('/', captchaController.getCaptcha);

// 验证验证码
router.post('/verify', captchaController.verifyCaptcha);

module.exports = router; 
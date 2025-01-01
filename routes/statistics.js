const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { auth } = require('../middleware/auth');
const authorGuard = require('../middleware/authorGuard');

// 获取统计数据（需要作者权限）
router.get('/', auth, authorGuard, statisticsController.getStatistics);

module.exports = router; 
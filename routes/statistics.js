const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { auth } = require('../middleware/auth');

// 获取统计数据（需要认证）
router.get('/', auth, statisticsController.getStatistics);

module.exports = router; 
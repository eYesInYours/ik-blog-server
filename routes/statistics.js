const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');

// 获取统计数据（需要作者权限）
router.get('/', auth, authorOnly, statisticsController.getStatistics);

module.exports = router; 
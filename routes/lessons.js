const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { auth } = require('../middleware/auth');

// 获取课时列表
router.get('/', auth, lessonController.getLessons);

// 获取使用记录
router.get('/records', auth, lessonController.getLessonRecords);

// 创建课时(充值)
router.post('/', auth, lessonController.createLesson);

// 使用课时
router.post('/:lessonId/use', auth, lessonController.useLesson);

// 获取统计数据
router.get('/stats', auth, lessonController.getLessonStats);

module.exports = router; 
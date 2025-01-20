const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');
const lessonController = require('../controllers/lessonController');
const lessonRecordController = require('../controllers/lessonRecordController');
const lessonOrderController = require('../controllers/lessonOrderController');

// 课程管理
router.get('/', auth, lessonController.getLessons); // 获取课程列表
router.post('/', auth, authorOnly, lessonController.createLesson); // 创建课程
router.get('/:id', auth, lessonController.getLessonById); // 获取课程详情
router.put('/:id', auth, authorOnly, lessonController.updateLesson); // 更新课程
router.delete('/:id', auth, authorOnly, lessonController.deleteLesson); // 删除课程
router.patch('/:id/status', auth, authorOnly, lessonController.updateLessonStatus); // 更新课程状态

// 订单管理
router.get('/orders', auth, authorOnly, lessonOrderController.getOrders);   
router.post('/orders', auth, authorOnly, lessonOrderController.createOrder);
router.get('/orders/:id', auth, lessonOrderController.getOrderById);
router.post('/orders/:id/pay', auth, lessonOrderController.payOrder);
router.post('/orders/:id/cancel', auth, authorOnly, lessonOrderController.cancelOrder);

// 课时记录
router.post('/records', auth, authorOnly, lessonRecordController.createRecord);
router.get('/records', auth, lessonRecordController.getRecords);
router.get('/records/:id', auth, lessonRecordController.getRecordById);

// 用户相关
router.get('/users/:userId/orders', auth, lessonOrderController.getUserOrders);
router.get('/users/:userId/records', auth, lessonRecordController.getUserRecords);
router.get('/users/:userId/stats', auth, lessonRecordController.getUserStats);

module.exports = router;
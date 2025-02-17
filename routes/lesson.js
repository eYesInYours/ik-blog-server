const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');
const lessonController = require('../controllers/lessonController');

// 课程管理
router.get('/', auth, lessonController.getLessons); // 获取课程列表
router.post('/', auth, authorOnly, lessonController.createLesson); // 创建课程
router.get('/:id', auth, lessonController.getLessonById); // 获取课程详情
router.put('/:id', auth, authorOnly, lessonController.updateLesson); // 更新课程
router.delete('/:id', auth, authorOnly, lessonController.deleteLesson); // 删除课程
router.patch('/:id/status', auth, authorOnly, lessonController.updateLessonStatus); // 更新课程状态
router.post('/sort', auth, authorOnly, lessonController.updateSort); // 更新课程排序

// 课程签到
router.post('/:lessonId/batchAttendance', auth, authorOnly, lessonController.batchAttendance);
router.get('/:lessonId/attendance-records', auth, lessonController.getAttendanceRecords);
router.put('/attendance-records/:batchId', auth, authorOnly, lessonController.updateAttendanceRecord);

// 关联学员
router.post('/enroll/:lessonId', auth, authorOnly, lessonController.enrollStudents)
router.post('/:lessonId/students', lessonController.enrollStudents);
router.delete('/:lessonId/students/:studentId', lessonController.removeStudent);

module.exports = router;
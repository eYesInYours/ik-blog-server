const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');
const studentController = require('../controllers/studentController');

// 学员管理
router.get('/', auth, studentController.getStudents);
router.post('/', auth, authorOnly, studentController.createStudent);

// 更新学员
router.put('/:id', auth, studentController.updateStudent);

// 删除学员
router.delete('/:id', auth, studentController.deleteStudent);

// 课程关联
router.post('/enroll', auth, authorOnly, studentController.enrollLesson);

// 签到与充值
router.post('/attendance', auth, authorOnly, studentController.attendance);
router.post('/recharge', auth, authorOnly, studentController.recharge);

// 获取上课记录
router.get('/:id/attendance', auth, studentController.getRecords);

module.exports = router; 
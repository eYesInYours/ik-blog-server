const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');
const studentController = require('../controllers/studentController');

// 获取收入分析 (放在具体 id 路由之前)
router.get('/income/analysis', auth, studentController.getIncomeAnalysis);

// 学员管理
router.get('/', auth, studentController.getStudents);
router.post('/', auth, authorOnly, studentController.createStudent);

// 更新学员
router.put('/:id', auth, studentController.updateStudent);

// 删除学员
router.delete('/:id', auth, studentController.deleteStudent);

// 签到与充值
router.post('/attendance', auth, authorOnly, studentController.attendance);
router.post('/recharge', auth, authorOnly, studentController.recharge);

// 获取上课记录
router.get('/:id/attendance', auth, studentController.getRecords);

// 获取学员分析数据
router.get('/:studentId/analysis', auth, studentController.getAnalysisData);

// 恢复学员
router.put('/:id/restore', auth, studentController.restoreStudent);

// 彻底删除学员
router.delete('/:id/permanent', auth, studentController.permanentDeleteStudent);

// 修改记录
router.put('/records/:id', auth, authorOnly, studentController.updateRecord);

// 更新学员状态
router.put('/:id/status', auth, studentController.updateStatus);

module.exports = router; 
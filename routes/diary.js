const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const diaryController = require('../controllers/diaryController');

// 客户端接口
router.post('/', auth, upload.array('images', 9), diaryController.createDiary);
router.get('/', diaryController.getDiaries);
router.post('/:id/like', auth, diaryController.toggleLike);
router.post('/:id/comment', auth, diaryController.comment);
router.delete('/:id', auth, diaryController.deleteDiary);

// 管理端接口
router.get('/admin/all', auth, diaryController.getAllDiaries);

module.exports = router; 
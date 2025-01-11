const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');

// 获取评论列表（支持文章和日记）
router.get('/article/:articleId', commentController.getComments); // 获取文章评论
router.get('/diary/:diaryId', commentController.getComments);    // 获取日记评论

// 需要认证的接口
// 创建评论（支持文章和日记）
router.post('/', auth, commentController.createComment);

// 评论管理（需要认证）
router.put('/:id', auth, commentController.updateComment);
router.delete('/:id', auth, commentController.deleteComment);

// 管理端接口（需要管理员权限）
router.get('/admin/all', auth, authorOnly, commentController.getAllComments);

// 评论点赞
router.put('/:id/like', auth, commentController.likeComment);

module.exports = router; 
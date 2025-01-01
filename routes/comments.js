const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { auth } = require('../middleware/auth');
const authorGuard = require('../middleware/authorGuard');

// 获取文章的所有评论
router.get('/article/:articleId', commentController.getArticleComments);

// 创建评论（需要认证）
router.post('/', auth, commentController.createComment);

// 更新评论（需要认证）
router.put('/:id', auth, commentController.updateComment);

// 删除评论（需要认证）
router.delete('/:id', auth, commentController.deleteComment);

// 获取所有评论（管理接口）
router.get('/admin/all', auth, authorGuard, commentController.getAllComments);

module.exports = router; 
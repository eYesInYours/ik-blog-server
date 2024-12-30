const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { auth } = require('../middleware/auth');

// 获取文章列表（公开）
router.get('/', articleController.getArticles);

// 获取单个文章（公开）
router.get('/:id', articleController.getArticle);

// 创建文章（需要认证）
router.post('/', auth, articleController.createArticle);

// 更新文章（需要认证）
router.put('/:id', auth, articleController.updateArticle);

// 删除文章（需要认证）
router.delete('/:id', auth, articleController.deleteArticle);

// 获取所有文章（管理接口）
router.get('/admin/all', auth, articleController.getAllArticlesAdmin);

// 更新文章状态（管理接口）
router.put('/admin/:id/status', auth, articleController.updateArticleStatus);

// 批量删除文章（管理接口）
router.post('/admin/batch-delete', auth, articleController.batchDeleteArticles);

module.exports = router; 
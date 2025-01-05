const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');

// 获取文章列表（公开）
router.get('/', articleController.getArticles);

// 获取单个文章（公开）
router.get('/:id', articleController.getArticle);

// 创建文章（需要作者权限）
router.post('/', auth, authorOnly, articleController.createArticle);

// 更新文章（需要作者权限）
router.put('/:id', auth, authorOnly, articleController.updateArticle);

// 删除文章（需要作者权限）
router.delete('/:id', auth, authorOnly, articleController.deleteArticle);

// 获取所有文章（管理接口）
router.get('/admin/all', auth, authorOnly, articleController.getAllArticlesAdmin);

// 更新文章状态（管理接口）
router.put('/admin/:id/status', auth, authorOnly, articleController.updateArticleStatus);

// 批量删除文章（管理接口）
router.post('/admin/batch-delete', auth, authorOnly, articleController.batchDeleteArticles);

module.exports = router; 
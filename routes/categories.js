const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');

// 公开路由
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.get('/:id/articles', categoryController.getCategoryArticles);

// 需要作者权限的路由
router.post('/', auth, authorOnly, categoryController.createCategory);
router.put('/:id', auth, authorOnly, categoryController.updateCategory);
router.delete('/:id', auth, authorOnly, categoryController.deleteCategory);

module.exports = router; 
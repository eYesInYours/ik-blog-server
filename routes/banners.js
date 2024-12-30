const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { auth } = require('../middleware/auth');

// 获取轮播图列表（公开）
router.get('/', bannerController.getBanners);

// 获取所有轮播图（管理接口）
router.get('/admin/all', auth, bannerController.getAllBanners);

// 创建轮播图（管理接口）
router.post('/', auth, bannerController.createBanner);

// 更新轮播图（管理接口）
router.put('/:id', auth, bannerController.updateBanner);

// 删除轮播图（管理接口）
router.delete('/:id', auth, bannerController.deleteBanner);

module.exports = router; 
const Banner = require('../models/Banner');
const chalk = require('chalk');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');

// 创建轮播图
exports.createBanner = async (req, res) => {
    try {
        const { title, image, link, order } = req.body;

        const banner = new Banner({
            title,
            image,
            ...(link && { link }),
            order: order || 0
        });

        await banner.save();

        console.log(chalk.green('轮播图创建成功:', banner.title));
        res.status(SUCCESS.CREATED).json({
            message: '轮播图创建成功',
            banner
        });
    } catch (error) {
        console.error(chalk.red('创建轮播图错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '创建轮播图失败' 
        });
    }
};

// 获取所有轮播图（前台展示）
exports.getBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ status: 'active' })
            .sort({ order: 1, createdAt: -1 });

        res.json(banners);
    } catch (error) {
        console.error(chalk.red('获取轮播图列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '获取轮播图列表失败' 
        });
    }
};

// 获取所有轮播图（管理接口）
exports.getAllBanners = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '' } = req.query;

        // 构建查询条件
        const query = keyword ? {
            title: new RegExp(keyword, 'i')
        } : {};

        const banners = await Banner.find(query)
            .sort({ order: 1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Banner.countDocuments(query);

        res.json({
            banners,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error(chalk.red('获取轮播图列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '获取轮播图列表失败' 
        });
    }
};

// 更新轮播图
exports.updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, image, link, order, status } = req.body;

        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({ 
                message: '轮播图不存在' 
            });
        }

        // 更新字段
        if (title) banner.title = title;
        if (image) banner.image = image;
        banner.link = link !== undefined ? link : banner.link;
        if (order !== undefined) banner.order = order;
        if (status) banner.status = status;

        await banner.save();

        res.json({
            message: '轮播图更新成功',
            banner
        });
    } catch (error) {
        console.error(chalk.red('更新轮播图错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '更新轮播图失败' 
        });
    }
};

// 删除轮播图
exports.deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({ 
                message: '轮播图不存在' 
            });
        }

        await banner.deleteOne();

        res.json({ 
            message: '轮播图删除成功' 
        });
    } catch (error) {
        console.error(chalk.red('删除轮播图错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '删除轮播图失败' 
        });
    }
}; 
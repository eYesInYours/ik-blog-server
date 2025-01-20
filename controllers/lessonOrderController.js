const LessonOrder = require('../models/LessonOrder');
const Lesson = require('../models/Lesson');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');
const chalk = require('chalk');

// 获取订单列表
exports.getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '', status } = req.query;
        
        const query = { isDeleted: false };
        if (status) {
            query.status = status;
        }

        const [orders, total] = await Promise.all([
            LessonOrder.find(query)
                .populate('userId', 'username email')
                .populate('lessonId', 'name')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            LessonOrder.countDocuments(query)
        ]);

        res.json(success({
            orders,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        }));
    } catch (err) {
        console.error(chalk.red('获取订单列表错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取订单列表失败'));
    }
};

// 创建订单
exports.createOrder = async (req, res) => {
    try {
        const { lessonId, userId, sessions } = req.body;

        // 查找课程
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '课程不存在'));
        }

        // 计算订单金额
        const amount = sessions * lesson.price;

        const order = new LessonOrder({
            lessonId,
            userId,
            sessions,
            remainingSessions: sessions,
            amount
        });

        await order.save();

        res.status(201).json(success(order, '订单创建成功'));
    } catch (err) {
        console.error(chalk.red('创建订单错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '创建订单失败'));
    }
};

// 获取订单详情
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await LessonOrder.findOne({ _id: id, isDeleted: false })
            .populate('userId', 'username email')
            .populate('lessonId', 'name');

        if (!order) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '订单不存在'));
        }

        res.json(success(order));
    } catch (err) {
        console.error(chalk.red('获取订单详情错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取订单详情失败'));
    }
};

// 支付订单
exports.payOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await LessonOrder.findById(id);
        if (!order) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '订单不存在'));
        }

        if (order.status !== 'pending') {
            return res.status(400).json(error(CLIENT_ERROR.BAD_REQUEST, '订单状态错误'));
        }

        order.status = 'paid';
        order.paidAt = new Date();
        await order.save();

        res.json(success(order, '支付成功'));
    } catch (err) {
        console.error(chalk.red('支付订单错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '支付订单失败'));
    }
};

// 取消订单
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await LessonOrder.findById(id);
        if (!order) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '订单不存在'));
        }

        if (order.status !== 'pending') {
            return res.status(400).json(error(CLIENT_ERROR.BAD_REQUEST, '只能取消待支付订单'));
        }

        order.status = 'cancelled';
        await order.save();

        res.json(success(null, '订单取消成功'));
    } catch (err) {
        console.error(chalk.red('取消订单错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '取消订单失败'));
    }
};

// 获取用户订单
exports.getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        const query = { userId, isDeleted: false };
        if (status) {
            query.status = status;
        }

        const [orders, total] = await Promise.all([
            LessonOrder.find(query)
                .populate('lessonId', 'name')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            LessonOrder.countDocuments(query)
        ]);

        res.json(success({
            orders,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        }));
    } catch (err) {
        console.error(chalk.red('获取用户订单错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取用户订单失败'));
    }
}; 
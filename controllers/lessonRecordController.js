const LessonRecord = require('../models/LessonRecord');
const LessonOrder = require('../models/LessonOrder');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');
const chalk = require('chalk');

// 创建上课记录
exports.createRecord = async (req, res) => {
    try {
        const { orderId, sessions, teacherName, content, remark } = req.body;

        // 查找订单
        const order = await LessonOrder.findById(orderId);
        if (!order) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '订单不存在'));
        }

        // 检查订单状态
        if (order.status !== 'paid') {
            return res.status(400).json(error(CLIENT_ERROR.BAD_REQUEST, '订单未支付'));
        }

        // 检查剩余课时
        if (order.remainingSessions < sessions) {
            return res.status(400).json(error(CLIENT_ERROR.BAD_REQUEST, '剩余课时不足'));
        }

        // 创建上课记录
        const record = new LessonRecord({
            orderId,
            userId: order.userId,
            lessonId: order.lessonId,
            sessions,
            teacherName,
            content,
            remark
        });

        // 更新订单剩余课时
        order.remainingSessions -= sessions;
        if (order.remainingSessions === 0) {
            order.status = 'completed';
            order.completedAt = new Date();
        }

        await Promise.all([record.save(), order.save()]);

        res.status(201).json(success({ record, order }, '记录创建成功'));
    } catch (err) {
        console.error(chalk.red('创建上课记录错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '创建上课记录失败'));
    }
};

// 获取记录列表
exports.getRecords = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const [records, total] = await Promise.all([
            LessonRecord.find({ isDeleted: false })
                .populate('userId', 'username email')
                .populate('lessonId', 'name')
                .populate('orderId')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            LessonRecord.countDocuments({ isDeleted: false })
        ]);

        res.json(success({
            records,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        }));
    } catch (err) {
        console.error(chalk.red('获取记录列表错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取记录列表失败'));
    }
};

// 获取记录详情
exports.getRecordById = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await LessonRecord.findOne({ _id: id, isDeleted: false })
            .populate('userId', 'username email')
            .populate('lessonId', 'name')
            .populate('orderId');

        if (!record) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '记录不存在'));
        }

        res.json(success(record));
    } catch (err) {
        console.error(chalk.red('获取记录详情错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取记录详情失败'));
    }
};

// 获取用户记录
exports.getUserRecords = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const [records, total] = await Promise.all([
            LessonRecord.find({ userId, isDeleted: false })
                .populate('lessonId', 'name')
                .populate('orderId')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            LessonRecord.countDocuments({ userId, isDeleted: false })
        ]);

        res.json(success({
            records,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        }));
    } catch (err) {
        console.error(chalk.red('获取用户记录错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取用户记录失败'));
    }
};

// 获取用户统计
exports.getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;

        // 获取用户所有已支付订单
        const orders = await LessonOrder.find({
            userId,
            status: { $in: ['paid', 'completed'] },
            isDeleted: false
        });

        // 计算统计数据
        const stats = {
            totalSessions: orders.reduce((sum, order) => sum + order.sessions, 0),
            remainingSessions: orders.reduce((sum, order) => sum + order.remainingSessions, 0),
            totalAmount: orders.reduce((sum, order) => sum + order.amount, 0),
            orderCount: orders.length
        };

        res.json(success(stats));
    } catch (err) {
        console.error(chalk.red('获取用户统计错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取用户统计失败'));
    }
}; 
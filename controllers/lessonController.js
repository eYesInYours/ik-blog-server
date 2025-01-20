const Lesson = require('../models/Lesson');
const LessonOrder = require('../models/LessonOrder');
const LessonRecord = require('../models/LessonRecord');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');
const chalk = require('chalk');

// 获取课程列表
exports.getLessons = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '', status } = req.query;
        
        // 构建查询条件
        const query = { isDeleted: false };
        
        // 关键词搜索
        if (keyword) {
            query.$or = [
                { name: new RegExp(keyword, 'i') },
                { description: new RegExp(keyword, 'i') }
            ];
        }

        // 状态筛选
        if (status) {
            query.status = status;
        }

        const [lessons, total] = await Promise.all([
            Lesson.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            Lesson.countDocuments(query)
        ]);

        res.json(success({
            lessons,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        }));
    } catch (err) {
        console.error(chalk.red('获取课程列表错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取课程列表失败'));
    }
};

// 创建课程
exports.createLesson = async (req, res) => {
    try {
        const { name, totalMinutes, totalSessions, minutesPerSession, price, description, cover } = req.body;

        const lesson = new Lesson({
            name,
            totalMinutes,
            totalSessions,
            minutesPerSession,
            price,
            description,
            cover
        });

        await lesson.save();

        res.status(201).json(success(lesson, '课程创建成功'));
    } catch (err) {
        console.error(chalk.red('创建课程错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '创建课程失败'));
    }
};

// 获取课程详情
exports.getLessonById = async (req, res) => {
    try {
        const { id } = req.params;

        const lesson = await Lesson.findOne({ _id: id, isDeleted: false });
        if (!lesson) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '课程不存在'));
        }

        res.json(success(lesson));
    } catch (err) {
        console.error(chalk.red('获取课程详情错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '获取课程详情失败'));
    }
};

// 更新课程
exports.updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, totalMinutes, totalSessions, minutesPerSession, price, description, cover, status } = req.body;

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '课程不存在'));
        }

        // 更新字段
        Object.assign(lesson, {
            name,
            totalMinutes,
            totalSessions,
            minutesPerSession,
            price,
            description,
            cover,
            status,
            updatedAt: new Date()
        });

        await lesson.save();

        res.json(success(lesson, '课程更新成功'));
    } catch (err) {
        console.error(chalk.red('更新课程错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '更新课程失败'));
    }
};

// 删除课程
exports.deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '课程不存在'));
        }

        // 软删除
        lesson.isDeleted = true;
        lesson.updatedAt = new Date();
        await lesson.save();

        res.json(success(null, '课程删除成功'));
    } catch (err) {
        console.error(chalk.red('删除课程错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '删除课程失败'));
    }
};

// 更新课程状态
exports.updateLessonStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '课程不存在'));
        }

        lesson.status = status;
        lesson.updatedAt = new Date();
        await lesson.save();

        res.json(success(lesson, '状态更新成功'));
    } catch (err) {
        console.error(chalk.red('更新课程状态错误:'), err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '更新课程状态失败'));
    }
};


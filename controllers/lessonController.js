const Lesson = require('../models/Lesson');
const Student = require('../models/Student');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const chalk = require('chalk');
const mongoose = require('mongoose');

// 获取课程列表
exports.getLessons = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword, status } = req.query;
        const query = {};

        // 构建查询条件
        if (keyword) {
            query.$or = [
                { name: new RegExp(keyword, 'i') },
                { description: new RegExp(keyword, 'i') }
            ];
        }
        if (status) {
            query.status = status;
        }

        const total = await Lesson.countDocuments(query);
        const lessons = await Lesson.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            code: SUCCESS.OK,
            data: {
                lessons,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        console.error(chalk.red('获取课程列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取课程列表失败'
        });
    }
};

// 创建课程
exports.createLesson = async (req, res) => {
    try {
        const lesson = new Lesson(req.body);
        await lesson.save();
        res.json({
            code: SUCCESS.OK,
            message: '课程创建成功',
            data: lesson
        });
    } catch (error) {
        console.error(chalk.red('创建课程错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '创建课程失败'
        });
    }
};

// 获取课程详情
exports.getLessonById = async (req, res) => {
    try {
        const { id } = req.params;
        // 检查 id 是否为有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的课程ID'
            });
        }

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        res.json({
            code: SUCCESS.OK,
            data: lesson
        });
    } catch (error) {
        console.error(chalk.red('获取课程详情错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取课程详情失败'
        });
    }
};

// 更新课程
exports.updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        // 检查 id 是否为有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的课程ID'
            });
        }

        const lesson = await Lesson.findByIdAndUpdate(id, req.body, { new: true });
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        res.json({
            code: SUCCESS.OK,
            message: '课程更新成功',
            data: lesson
        });
    } catch (error) {
        console.error(chalk.red('更新课程错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '更新课程失败'
        });
    }
};

// 删除课程
exports.deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        // 检查 id 是否为有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的课程ID'
            });
        }

        const lesson = await Lesson.findByIdAndDelete(id);
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        res.json({
            code: SUCCESS.OK,
            message: '课程删除成功'
        });
    } catch (error) {
        console.error(chalk.red('删除课程错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '删除课程失败'
        });
    }
};

// 更新课程状态
exports.updateLessonStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 检查 id 是否为有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的课程ID'
            });
        }

        const lesson = await Lesson.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        res.json({
            code: SUCCESS.OK,
            message: '状态更新成功',
            data: lesson
        });
    } catch (error) {
        console.error(chalk.red('更新课程状态错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '更新课程状态失败'
        });
    }
};

// 获取课程的学员列表
exports.getLessonStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的课程ID'
            });
        }

        const students = await Student.find({
            'lessons.lessonId': id
        })
        .select('name phone email status lessons.$')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

        const total = await Student.countDocuments({
            'lessons.lessonId': id
        });

        res.json({
            code: SUCCESS.OK,
            data: {
                students,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        console.error(chalk.red('获取课程学员列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取课程学员列表失败'
        });
    }
};

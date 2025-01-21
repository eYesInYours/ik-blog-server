const Student = require('../models/Student');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const chalk = require('chalk');
const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');
const Record = require('../models/Record');
const moment = require('moment');

// 获取学员列表
exports.getStudents = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword, status } = req.query;
        const query = {};

        if (keyword) {
            query.$or = [
                { name: new RegExp(keyword, 'i') },
                { phone: new RegExp(keyword, 'i') },
                { email: new RegExp(keyword, 'i') }
            ];
        }
        if (status) {
            query.status = status;
        }

        const total = await Student.countDocuments(query);
        const students = await Student.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

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
        console.error(chalk.red('获取学员列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取学员列表失败'
        });
    }
};

// 创建学员
exports.createStudent = async (req, res) => {
    try {
        const { name, phone, email, lessonId, remark } = req.body;

        // 获取课程信息
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        const student = new Student({
            name,
            phone,
            email,
            lessonId,
            totalSessions: lesson.totalSessions, // 使用课程设置的总课时
            remainingSessions: lesson.totalSessions, // 初始剩余课时等于总课时
            remark
        });

        await student.save();

        // 返回带课程信息的学员数据
        const populatedStudent = await Student.findById(student._id)
            .populate('lessonId', 'name type');

        res.json({
            code: SUCCESS.OK,
            message: '学员创建成功',
            data: populatedStudent
        });
    } catch (error) {
        console.error(chalk.red('创建学员错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '创建学员失败'
        });
    }
};

// 关联课程
exports.enrollLesson = async (req, res) => {
    try {
        const { studentId, lessonId, totalSessions} = req.body;

        const student = await Student.findById(studentId);
        if (!student) {
            throw new Error('学员不存在');
        }

        // 检查是否已经关联了该课程
        const existingLesson = student.lessons.find(
            l => l.lessonId.toString() === lessonId && l.status === 'active'
        );
        if (existingLesson) {
            throw new Error('该学员已关联此课程');
        }

        // 添加新课程
        student.lessons.push({
            lessonId,
            totalSessions,
            remainingSessions: totalSessions,
        });

        await student.save();

        res.json({
            code: SUCCESS.OK,
            message: '课程关联成功',
            data: student.lessons[student.lessons.length - 1]
        });
    } catch (error) {
        console.error(chalk.red('关联课程错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: error.message || '关联课程失败'
        });
    }
};

// 签到
exports.attendance = async (req, res) => {
    try {
        const { studentId, lessonId, sessions, attendanceTime, remark } = req.body;

        const [student, lesson] = await Promise.all([
            Student.findById(studentId),
            Lesson.findById(lessonId)
        ]);

        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        // 计算扣除的金额
        const amount = -(sessions * lesson.price);

        // 创建签到记录
        const record = new Record({
            studentId,
            lessonId,
            type: 'attendance',
            sessions: -sessions,
            amount,
            recordTime: attendanceTime || new Date(),
            remark
        });
        await record.save();

        // 更新学员余额
        student.balance += amount;
        await student.save();

        res.json({
            code: SUCCESS.OK,
            message: '签到成功',
            data: {
                record,
                balance: student.balance
            }
        });
    } catch (error) {
        console.error(chalk.red('签到错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '签到失败'
        });
    }
};

// 充值
exports.recharge = async (req, res) => {
    try {
        const { studentId, amount, remark } = req.body;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        // 创建充值记录
        const record = new Record({
            studentId,
            type: 'recharge',
            amount,
            recordTime: new Date(),
            remark
        });
        await record.save();

        // 更新学员余额
        student.balance += amount;
        await student.save();

        res.json({
            code: SUCCESS.OK,
            message: '充值成功',
            data: student
        });
    } catch (error) {
        console.error(chalk.red('充值错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '充值失败'
        });
    }
};

// 更新学员信息
exports.updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, remark } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的学员ID'
            });
        }

        const student = await Student.findById(id);
        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        // 更新基本信息
        student.name = name;
        student.phone = phone;
        student.email = email;
        student.remark = remark;

        await student.save();

        // 返回更新后的学员信息（包含课程信息）
        const updatedStudent = await Student.findById(id)
            .populate('lessonId', 'name type');

        res.json({
            code: SUCCESS.OK,
            message: '更新成功',
            data: updatedStudent
        });
    } catch (error) {
        console.error(chalk.red('更新学员错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '更新学员失败'
        });
    }
};

// 删除学员
exports.deleteStudent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的学员ID'
            });
        }

        // 检查学员是否存在
        const student = await Student.findById(id);
        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        // 检查是否有未完成的课程
        if (student.remainingSessions > 0) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '该学员还有未完成的课程，无法删除'
            });
        }

        // 删除相关的所有记录
        await Record.deleteMany({ studentId: id }, { session });

        // 删除学员
        await Student.findByIdAndDelete(id, { session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            code: SUCCESS.OK,
            message: '删除成功'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error(chalk.red('删除学员错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '删除学员失败'
        });
    }
};

// 获取学员记录
exports.getRecords = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的学员ID'
            });
        }

        // 获取所有记录
        const total = await Record.countDocuments({ studentId: id });
        const records = await Record.find({ studentId: id })
            .sort({ recordTime: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            code: SUCCESS.OK,
            data: {
                records,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        console.error(chalk.red('获取记录错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取记录失败'
        });
    }
};

// 获取分析数据
exports.getAnalysisData = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { timeRange = 'month' } = req.query;
        
        // 设置时间范围
        const now = moment();
        let startTime;
        let dateFormat;
        
        switch (timeRange) {
            case 'week':
                startTime = moment().startOf('week');
                dateFormat = 'MM-DD';
                break;
            case 'month':
                startTime = moment().startOf('month');
                dateFormat = 'MM-DD';
                break;
            case 'year':
                startTime = moment().startOf('year');
                dateFormat = 'YYYY-MM';
                break;
            default:
                startTime = moment().startOf('month');
                dateFormat = 'MM-DD';
        }

        // 查询该时间段内的所有记录
        const records = await Record.find({
            studentId,
            recordTime: {
                $gte: startTime.toDate(),
                $lte: now.toDate()
            }
        }).sort('recordTime');

        // 计算充值总额
        const rechargeRecords = records.filter(r => r.type === 'recharge');
        const totalRecharge = rechargeRecords.length > 0 
            ? rechargeRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
            : 0;

        // 计算消费总额
        const attendanceRecords = records.filter(r => r.type === 'attendance');
        const totalConsumption = attendanceRecords.length > 0
            ? Math.abs(attendanceRecords.reduce((sum, r) => sum + (r.amount || 0), 0))
            : 0;

        // 计算总课时
        const totalSessions = attendanceRecords.length > 0
            ? attendanceRecords.reduce((sum, r) => sum + Math.abs(r.sessions || 0), 0)
            : 0;

        // 生成日期序列
        const dates = [];
        const current = moment(startTime);
        while (current <= now) {
            dates.push(current.format(dateFormat));
            current.add(1, timeRange === 'year' ? 'month' : 'day');
        }

        // 初始化趋势数据
        const amountTrend = {
            dates,
            recharge: new Array(dates.length).fill(0),
            consumption: new Array(dates.length).fill(0)
        };

        const sessionsTrend = {
            dates,
            sessions: new Array(dates.length).fill(0)
        };

        // 填充趋势数据
        records.forEach(record => {
            const date = moment(record.recordTime).format(dateFormat);
            const index = dates.indexOf(date);
            if (index !== -1) {
                if (record.type === 'recharge') {
                    amountTrend.recharge[index] += record.amount || 0;
                } else if (record.type === 'attendance') {
                    amountTrend.consumption[index] += Math.abs(record.amount || 0);
                    sessionsTrend.sessions[index] += Math.abs(record.sessions || 0);
                }
            }
        });

        res.json({
            code: SUCCESS.OK,
            data: {
                totalRecharge,
                totalConsumption,
                totalSessions,
                amountTrend,
                sessionsTrend
            }
        });
    } catch (error) {
        console.error(chalk.red('获取分析数据错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取分析数据失败'
        });
    }
}; 
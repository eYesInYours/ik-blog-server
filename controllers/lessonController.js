const Lesson = require('../models/Lesson');
const Student = require('../models/Student');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const chalk = require('chalk');
const mongoose = require('mongoose');
const Record = require('../models/Record');

// 获取课程列表
exports.getLessons = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword, type, stage, status } = req.query;
        const query = {};

        if (keyword) {
            query.$or = [
                { name: new RegExp(keyword, 'i') },
                { description: new RegExp(keyword, 'i') }
            ];
        }

        if (type) {
            query.type = type;
        }

        if (stage) {
            query.stage = stage;
        }

        if (status) {
            query.status = status;
        }

        const lessons = await Lesson.find(query)
            .sort({ sort: 1, createdAt: -1 }) // 先按sort排序，再按创建时间倒序
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Lesson.countDocuments(query);

        res.json({
            code: 200,
            data: {
                lessons,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('获取课程列表失败:', error);
        res.status(500).json({
            code: 500,
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

// 更新课程排序
exports.updateSort = async (req, res) => {
    try {
        const { id, targetId, type } = req.body

        // 获取当前课程和目标课程的排序值
        const currentLesson = await Lesson.findById(id)
        const targetLesson = await Lesson.findById(targetId)

        if (!currentLesson || !targetLesson) {
            return res.status(404).json({
                code: 404,
                message: '课程不存在'
            })
        }

        // 计算新的排序值
        const newSort = type === 'after'
            ? targetLesson.sort + 1
            : targetLesson.sort - 1

        // 更新排序值
        await Lesson.findByIdAndUpdate(id, { sort: newSort })

        // 重新排序所有课程，确保排序值连续
        const lessons = await Lesson.find().sort('sort')
        for (let i = 0; i < lessons.length; i++) {
            await Lesson.findByIdAndUpdate(lessons[i]._id, { sort: i + 1 })
        }

        res.json({
            code: 200,
            message: '排序更新成功'
        })
    } catch (error) {
        console.error('更新排序失败:', error)
        res.status(500).json({
            code: 500,
            message: '更新排序失败'
        })
    }
}

// 关联学员
exports.enrollStudents = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { studentIds } = req.body;

        // 验证课程是否存在
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        // 验证学员是否存在
        const students = await Student.find({ 
            _id: { $in: studentIds },
            deleted: false 
        });
        if (students.length !== studentIds.length) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '部分学员不存在或已删除'
            });
        }

        // 检查学员是否已经关联了该课程
        const existingEnrollments = await Student.find({
            _id: { $in: studentIds },
            'lessons.lessonId': lessonId
        });
        if (existingEnrollments.length) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '部分学员已关联该课程'
            });
        }

        // 为每个学员添加课程关联信息
        await Student.updateMany(
            { _id: { $in: studentIds } },
            {
                $push: {
                    lessons: {
                        lessonId,
                        totalSessions: lesson.totalSessions,
                        remainingSessions: lesson.totalSessions,
                        startDate: new Date(),
                        status: 'active'
                    }
                }
            }
        );

        res.json({
            code: 200,
            message: '关联学员成功'
        });
    } catch (error) {
        console.error('关联学员失败:', error);
        res.status(500).json({
            code: 500,
            message: "关联学员失败"
        });
    }
};

// 移除学员
exports.removeStudent = async (req, res) => {
    try {
        const { lessonId, studentId } = req.params;

        // 验证课程是否存在
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        // 验证学员是否存在
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        // 移除课程关联
        await Student.updateOne(
            { _id: studentId },
            { $pull: { lessons: { lessonId } } }
        );

        res.json({
            code: SUCCESS.OK,
            message: '移除学员成功'
        });
    } catch (error) {
        console.error('移除学员失败:', error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '移除学员失败'
        });
    }
};

// 获取课程签到记录
exports.getAttendanceRecords = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // 查询相关的课程信息
        const lesson = await Lesson.findById(lessonId)

        // 使用聚合查询按批次分组
        const records = await Record.aggregate([
            {
                $match: {
                    lessonId: new mongoose.Types.ObjectId(lessonId),
                    type: 'attendance',
                    batchId: { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$batchId',
                    recordTime: { $first: '$recordTime' },
                    studentIds: { $first: '$studentIds' },
                    remark: { $first: '$remark' },
                    modifyHistory: { $first: '$modifyHistory' },
                    students: {
                        $push: {
                            studentId: '$studentId',
                            sessions: '$sessions',
                            amount: '$amount'
                        }
                    },
                    totalSessions: { $sum: { $abs: '$sessions' } },
                    totalAmount: { $sum: { $abs: '$amount' } }
                }
            },
            {
                $sort: { recordTime: -1 }
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: Number(limit)
            }
        ]);

        console.log(lesson, records)

        // 获取总记录数
        const total = await Record.distinct('batchId', {
            lessonId: new mongoose.Types.ObjectId(lessonId),
            type: 'attendance',
            batchId: { $exists: true }
        }).then(ids => ids.length);

        // 获取所有相关的学员信息
        const studentIds = records.reduce((ids, record) => [...ids, ...record.studentIds], []);
        const students = await Student.find({ _id: { $in: studentIds } }, 'name phone');
        const studentMap = new Map(students.map(s => [s._id.toString(), s]));

        res.json({
            code: SUCCESS.OK,
            data: {
                records: records.map(record => ({
                    batchId: record._id,
                    recordTime: record.recordTime,
                    remark: record.remark || '',
                    modifyHistory: record.modifyHistory || [],
                    students: record.studentIds.map(id => {
                        const student = studentMap.get(id.toString());
                        const recordData = record.students.find(s => s.studentId.toString() === id.toString());
                        return {
                            _id: id,
                            name: student?.name || '未知学员',
                            phone: student?.phone || '',
                            sessions: recordData?.sessions || 0,
                            amount: recordData?.amount || 0
                        };
                    }),
                    totalSessions: record.totalSessions,
                    totalAmount: record.totalAmount
                })),
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        console.error('获取课程签到记录失败:', error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取课程签到记录失败'
        });
    }
};

// 课程批量签到
exports.batchAttendance = async (req, res) => {
    try {
        const { studentIds, sessions, attendanceTime, remark } = req.body;
        const { lessonId } = req.params;
        console.log(req.body, lessonId)
        if (!studentIds || !Array.isArray(studentIds) || !studentIds.length) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '请选择要签到的学员'
            });
        }

        // 获取课程信息
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        // 生成批次ID
        const batchId = new mongoose.Types.ObjectId();

        // 为每个学员创建签到记录
        const records = await Promise.all(studentIds.map(async (studentId) => {
            // 计算课时费
            const amount = -(lesson.price * sessions);

            // 创建签到记录
            const record = new Record({
                studentId,
                lessonId,
                type: 'attendance',
                sessions: -sessions,
                amount,
                recordTime: attendanceTime || new Date(),
                remark,
                batchId,
                studentIds
            });

            await record.save();

            // 更新学员余额
            await Student.findByIdAndUpdate(
                studentId,
                { $inc: { balance: amount } }
            );

            return record;
        }));

        res.json({
            code: SUCCESS.OK,
            data: {
                batchId,
                records
            },
            message: '批量签到成功'
        });
    } catch (error) {
        console.error('批量签到失败:', error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '批量签到失败'
        });
    }
};

// 更新签到记录
exports.updateAttendanceRecord = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { sessions, remark } = req.body;

        // 查找原记录
        const records = await Record.find({ batchId });
        if (!records.length) {
            return res.status(404).json({
                code: 404,
                message: '未找到签到记录'
            });
        }

        try {
            // 更新所有相关记录
            const updatePromises = records.map(async record => {
                // 计算金额变化
                const oldAmount = record.amount;
                const newAmount = -sessions * Math.abs(record.amount / record.sessions);
                const amountDiff = newAmount - oldAmount;

                // 保存修改历史
                const modifyHistory = {
                    before: {
                        sessions: record.sessions,
                        amount: record.amount
                    },
                    after: {
                        sessions: -sessions,
                        amount: newAmount
                    },
                    modifiedAt: new Date()
                };

                // 更新记录
                const updatedRecord = await Record.findByIdAndUpdate(
                    record._id,
                    {
                        $set: {
                            sessions: -sessions,
                            amount: newAmount,
                            remark: remark
                        },
                        $push: { modifyHistory }
                    },
                    { new: true }
                );

                // 更新学员余额
                await Student.findByIdAndUpdate(
                    record.studentId,
                    { $inc: { balance: amountDiff } }
                );

                return updatedRecord;
            });

            const updatedRecords = await Promise.all(updatePromises);

            res.json({
                code: 200,
                message: '修改成功',
                data: {
                    records: updatedRecords
                }
            });
        } catch (error) {
            throw error;
        }
    } catch (error) {
        console.error('修改签到记录失败:', error);
        res.status(500).json({
            code: 500,
            message: '修改签到记录失败'
        });
    }
};


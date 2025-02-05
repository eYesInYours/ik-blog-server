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
        const { page = 1, limit = 10, keyword, status, deleted, lessonId } = req.query;

        // 构建查询条件
        const query = {};
        
        // 处理删除状态查询
        if (deleted !== undefined) {
            query.deleted = deleted === 'true';
        }

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
        const { name, phone, email, remark } = req.body;

        // 验证手机号是否已存在
        const existingStudent = await Student.findOne({ phone, deleted: false });
        if (existingStudent) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '该手机号已被注册'
            });
        }

        // 创建学员
        const student = await Student.create({
            name,
            phone,
            email,
            remark,
            balance: 0,
            status: 'active'
        });

        // 直接返回创建的学员数据，不需要populate
        res.status(SUCCESS.OK).json({
            code: SUCCESS.OK,
            data: student,
            message: '创建成功'
        });
    } catch (error) {
        console.error('创建学员失败:', error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: error.message || '创建学员失败'
        });
    }
};

// 签到
exports.attendance = async (req, res) => {
    try {
        const { studentId, lessonId, sessions, attendanceTime } = req.body;

        // 获取课程信息
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '课程不存在'
            });
        }

        // 计算课时费
        const amount = -(lesson.price * Math.abs(sessions)); // 使用负数表示支出

        // 获取学员当前余额
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        // 创建签到记录
        const record = new Record({
            studentId,
            lessonId,
            type: 'attendance',
            sessions: -sessions, // 使用负数表示消耗课时
            amount, // 负数表示支出
            recordTime: attendanceTime || new Date(),
            remark: req.body.remark
        });

        await record.save();

        // 更新学员余额
        const newBalance = student.balance + amount; // 扣减余额
        await Student.findByIdAndUpdate(studentId, { balance: newBalance });

        res.json({
            code: SUCCESS.OK,
            data: {
                record,
                balance: newBalance
            }
        });
    } catch (error) {
        console.error('签到失败:', error);
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

// 更新学员
exports.updateStudent = async (req, res) => {
    try {
        const { id } = req.params
        const { name, phone, email, remark } = req.body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的学员ID'
            })
        }

        // 检查手机号是否被其他学员使用
        const existingStudent = await Student.findOne({
            phone,
            _id: { $ne: id },
            deleted: false
        })
        if (existingStudent) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '该手机号已被其他学员使用'
            })
        }

        // 更新学员信息
        const student = await Student.findByIdAndUpdate(
            id,
            {
                name,
                phone,
                email,
                remark
            },
            { new: true } // 返回更新后的文档
        )

        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            })
        }

        res.json({
            code: SUCCESS.OK,
            data: student,
            message: '更新成功'
        })
    } catch (error) {
        console.error('更新学员失败:', error)
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '更新学员失败'
        })
    }
}

// 软删除学员
exports.deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的学员ID'
            });
        }

        // 软删除，更新deleted字段
        await Student.findByIdAndUpdate(id, {
            deleted: true,
            deletedAt: new Date()
        });

        res.json({
            code: SUCCESS.OK,
            message: '删除成功'
        });
    } catch (error) {
        console.error('删除学员失败:', error);
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
        const { page = 1, limit = 10, type } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的学员ID'
            });
        }

        // 检查学员是否存在且未删除
        const student = await Student.findOne({ _id: id, deleted: false });
        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        // 构建查询条件
        const query = { studentId: id }
        if (type) {
            query.type = type
        }

        // 获取记录总数
        const total = await Record.countDocuments(query);

        // 获取记录列表，按创建时间降序排序
        const records = await Record.find(query)
            .sort({ recordTime: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('lessonId', 'name price');

        // 计算学员当前余额
        const allRecords = await Record.find({ studentId: id });
        let balance = 0;
        allRecords.forEach(record => {
            if (record.type === 'recharge') {
                // 充值记录：增加余额
                balance += Math.abs(record.amount);
            } else if (record.type === 'attendance') {
                // 签到记录：扣减余额
                balance -= Math.abs(record.amount);
            }
        });

        // 更新学员余额
        await Student.findByIdAndUpdate(id, { balance });

        res.json({
            code: SUCCESS.OK,
            data: {
                records,
                balance, // 返回当前余额
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        console.error('获取记录失败:', error);
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

// 恢复学员
exports.restoreStudent = async (req, res) => {
    try {
        const { id } = req.params

        const student = await Student.findByIdAndUpdate(id, {
            deleted: false,
            deletedAt: null
        })

        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            })
        }

        res.json({
            code: SUCCESS.OK,
            message: '恢复成功'
        })
    } catch (error) {
        console.error('恢复学员失败:', error)
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '恢复学员失败'
        })
    }
}

// 彻底删除学员
exports.permanentDeleteStudent = async (req, res) => {
    try {
        const { id } = req.params

        const student = await Student.findByIdAndDelete(id)
        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            })
        }

        // 删除相关记录
        await Record.deleteMany({ studentId: id })

        res.json({
            code: SUCCESS.OK,
            message: '删除成功'
        })
    } catch (error) {
        console.error('彻底删除学员失败:', error)
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '彻底删除学员失败'
        })
    }
}

// 修改记录
exports.updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessions, amount, recordTime, remark } = req.body;

        // 查找记录
        const record = await Record.findById(id).populate('lessonId');
        if (!record) {
            return res.status(404).json({
                code: 404,
                message: '记录不存在'
            });
        }

        // 保存修改前的值
        const beforeValues = {
            amount: record.amount,
            sessions: record.sessions,
            recordTime: record.recordTime,
        };

        // 根据记录类型处理不同的修改逻辑
        if (record.type === 'attendance') {
            if (!record.lessonId) {
                return res.status(400).json({
                    code: 400,
                    message: '课程信息不存在'
                });
            }

            // 计算新的扣费金额
            const newAmount = -(sessions * record.lessonId.price);
            
            // 更新学员余额
            const amountDiff = newAmount - record.amount;
            await Student.findByIdAndUpdate(
                record.studentId,
                { $inc: { balance: -amountDiff } }
            );

            // 更新记录
            record.amount = Number(newAmount.toFixed(2));
            record.sessions = -sessions;  // 保持负数表示扣除
            if (recordTime) {
                record.recordTime = recordTime; // 更新签到时间
            }
        } else {
            // 充值记录只更新金额
            const amountDiff = amount - record.amount;
            await Student.findByIdAndUpdate(
                record.studentId,
                { $inc: { balance: amountDiff } }
            );

            record.amount = amount;
        }

        // 修改记录的备注
        record.remark = remark;

        // 添加修改历史
        record.modifyHistory.push({
            before: beforeValues,
            after: {
                amount: record.amount,
                sessions: record.sessions,
                recordTime: record.recordTime,
            }
        });

        await record.save();

        res.json({
            code: 200,
            data: record,
            message: '修改成功'
        });
    } catch (error) {
        console.error('修改记录失败:', error);
        res.status(500).json({
            code: 500,
            message: '修改记录失败'
        });
    }
};

// 获取收入分析数据
exports.getIncomeAnalysis = async (req, res) => {
  try {
    const { timeRange = 'month', date } = req.query;
    
    // 确定时间范围和分组格式
    let startDate;
    let endDate;
    let groupFormat;
    
    const selectedDate = date ? new Date(date) : new Date();
    
    switch(timeRange) {
      case 'week':
        // 获取所选日期所在周的周一
        startDate = new Date(selectedDate);
        startDate.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
        // 周日
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        groupFormat = "%Y-%m-%d";
        break;
        
      case 'year':
        startDate = new Date(selectedDate.getFullYear(), 0, 1);
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
        groupFormat = "%Y-%m";
        break;
        
      case 'month':
      default:
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        groupFormat = "%Y-%m-%d";
        break;
    }

    // 聚合查询收入和课时数据
    const records = await Record.aggregate([
      {
        $match: {
          recordTime: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: "$recordTime" } },
            type: "$type"
          },
          totalAmount: { $sum: "$amount" },
          // 只统计签到类型的课时数，并取绝对值（因为签到记录的 sessions 是负数）
          totalSessions: {
            $sum: {
              $cond: [
                { $eq: ["$type", "attendance"] },
                { $abs: "$sessions" },
                0
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          income: {
            $push: {
              type: "$_id.type",
              amount: "$totalAmount",
              sessions: "$totalSessions"
            }
          }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // 生成完整的日期序列
    const dates = [];
    const rechargeAmounts = [];
    const consumptionAmounts = [];
    const sessionCounts = []; // 添加课时数组
    let totalRecharge = 0;
    let totalConsumption = 0;
    let totalSessions = 0; // 添加总课时统计

    // 根据时间范围生成日期序列
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      let dateStr;
      if (timeRange === 'year') {
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        dateStr = `${currentDate.getFullYear()}-${month}`;
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        dateStr = currentDate.toISOString().slice(0, 10);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      dates.push(dateStr);
      
      // 查找对应日期的记录
      const record = records.find(r => r._id === dateStr);
      if (record) {
        const recharge = record.income.find(i => i.type === 'recharge')?.amount || 0;
        const consumption = Math.abs(record.income.find(i => i.type === 'attendance')?.amount || 0);
        // 只获取签到记录的课时数
        const sessions = record.income.find(i => i.type === 'attendance')?.sessions || 0;
        
        rechargeAmounts.push(recharge);
        consumptionAmounts.push(consumption);
        sessionCounts.push(sessions);
        
        totalRecharge += recharge;
        totalConsumption += consumption;
        totalSessions += sessions;
      } else {
        rechargeAmounts.push(0);
        consumptionAmounts.push(0);
        sessionCounts.push(0);
      }
    }

    // 计算实际到手收入
    const actualIncome = Math.min(totalRecharge, totalConsumption);

    res.json({
      code: 200,
      data: {
        summary: {
          totalRecharge,         // 总充值金额（押金）
          totalConsumption,      // 总消费金额
          profit: actualIncome,  // 实际到手收入
          pendingIncome: totalConsumption - actualIncome, // 待收金额
          totalSessions         // 总课时数
        },
        trend: {
          dates,
          recharge: rechargeAmounts,    // 充值金额趋势
          consumption: consumptionAmounts, // 消费金额趋势
          sessions: sessionCounts       // 课时趋势
        }
      }
    });
  } catch (error) {
    console.error('获取收入分析失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取收入分析失败'
    });
  }
};

// 更新学员状态
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 验证状态值
        if (!['active', 'inactive'].includes(status)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '无效的状态值'
            });
        }

        // 更新学员状态
        const student = await Student.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!student) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '学员不存在'
            });
        }

        res.json({
            code: SUCCESS.OK,
            data: student,
            message: '状态更新成功'
        });
    } catch (error) {
        console.error('更新学员状态失败:', error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '更新学员状态失败'
        });
    }
}; 
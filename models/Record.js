const mongoose = require('mongoose');

// 修改历史的子模式
const modifyHistorySchema = new mongoose.Schema({
    // 修改前的值
    before: {
        amount: Number,
        sessions: Number
    },
    // 修改后的值
    after: {
        amount: Number,
        sessions: Number
    },
    // 修改时间
    modifiedAt: {
        type: Date,
        default: Date.now
    }
});

const recordSchema = new mongoose.Schema({
    // 批量签到ID（用于关联同一次课程签到的多条记录）
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    // 批量签到的学员Id
    studentIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Student',
        required: false
    },
    // 关联学员
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    // 关联课程（签到必填，充值可选）
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: function () {
            return this.type === 'attendance';
        }
    },
    // 记录类型
    type: {
        type: String,
        enum: ['attendance', 'recharge'],
        required: true
    },
    // 课时变动数（签到必填，充值可选）
    sessions: {
        type: Number,
        required: function () {
            return this.type === 'attendance';
        }
    },
    // 金额变动
    amount: {
        type: Number,
        required: true
    },
    // 记录时间
    recordTime: {
        type: Date,
        default: Date.now
    },
    // 备注
    remark: String,
    // 添加修改历史数组
    modifyHistory: [modifyHistorySchema]
}, {
    timestamps: true,   // 添加创建和更新时间
});

module.exports = mongoose.model('Record', recordSchema); 
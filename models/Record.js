const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    // 关联学员
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    // 关联课程
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    // 记录类型
    type: {
        type: String,
        enum: ['attendance', 'recharge'],
        required: true
    },
    // 课时变动数（签到为负数，充值为正数）
    sessions: {
        type: Number,
        required: true
    },
    // 记录时间
    recordTime: {
        type: Date,
        default: Date.now
    },
    // 备注
    remark: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Record', recordSchema); 
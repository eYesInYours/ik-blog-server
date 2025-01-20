const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    // 学员姓名
    name: {
        type: String,
        required: true
    },
    // 联系电话
    phone: {
        type: String,
        required: true
    },
    // 邮箱
    email: {
        type: String,
        required: false
    },
    // 课程信息
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    // 总课时数
    totalSessions: {
        type: Number,
        required: true,
        min: 0
    },
    // 剩余课时数
    remainingSessions: {
        type: Number,
        required: true,
        min: 0
    },
    // 开始日期
    startDate: {
        type: Date,
        required: false
    },
    // 结束日期
    endDate: {
        type: Date,
        required: false
    },
    // 备注
    remark: {
        type: String
    },
    // 状态: active-在读, inactive-结业
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Student', studentSchema); 
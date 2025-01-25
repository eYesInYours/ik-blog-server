const mongoose = require('mongoose');

const lessonOrderSchema = new mongoose.Schema({
    // 关联用户
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // 关联课程
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    // 购买节数
    sessions: {
        type: Number,
        required: true,
        min: 1
    },
    // 剩余节数
    remainingSessions: {
        type: Number,
        required: true,
        min: 0
    },
    // 订单金额
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    // 订单状态: pending-待支付, paid-已支付, completed-已完成, cancelled-已取消
    status: {
        type: String,
        enum: ['pending', 'paid', 'completed', 'cancelled'],
        default: 'pending'
    },
    // 创建时间
    createdAt: {
        type: Date,
        default: Date.now
    },
    // 支付时间
    paidAt: Date,
    // 完成时间
    completedAt: Date,
    // 是否删除
    isDeleted: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('LessonOrder', lessonOrderSchema); 
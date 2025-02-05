const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    // 关联的学生Id
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
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
    // 账户余额
    balance: {
        type: Number,
        default: 0,
        required: true
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
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Student', studentSchema); 
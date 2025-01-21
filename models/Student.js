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
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Student', studentSchema); 
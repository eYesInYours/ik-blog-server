const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    // 课程名称
    name: {
        type: String,
        required: true
    },
    // 课程类型: private-一对一, group-班课
    type: {
        type: String,
        enum: ['private', 'group'],
        required: true
    },
    // 总课时数(分钟)
    totalMinutes: {
        type: Number,
        required: true,
        min: 0
    },
    // 总节数
    totalSessions: {
        type: Number,
        required: true,
        min: 1
    },
    // 单节课时长(分钟)
    minutesPerSession: {
        type: Number,
        required: true,
        min: 0
    },
    // 课程价格(元)
    price: {
        type: Number,
        required: true,
        min: 0
    },
    // 课程描述
    description: {
        type: String,
        required: false
    },
    // 课程封面
    cover: {
        type: String,
        required: false
    },
    // 状态: active-启用, inactive-禁用
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    // 创建时间
    createdAt: {
        type: Date,
        default: Date.now
    },
    // 更新时间
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // 是否删除
    isDeleted: {
        type: Boolean,
        default: false
    },
    sort: {
        type: Number,
        default: 0
    },
    stage: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced'],
        default: 'basic',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lesson', lessonSchema);

const mongoose = require('mongoose');

const lessonRecordSchema = new mongoose.Schema({
    // 关联订单
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LessonOrder',
        required: true
    },
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
    // 上课节数
    sessions: {
        type: Number,
        required: true,
        min: 1
    },
    // 授课教师
    teacherName: {
        type: String,
        required: true
    },
    // 上课内容
    content: {
        type: String,
        required: true
    },
    // 备注
    remark: String,
    // 创建时间
    createdAt: {
        type: Date,
        default: Date.now
    },
    // 是否删除
    isDeleted: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('LessonRecord', lessonRecordSchema); 
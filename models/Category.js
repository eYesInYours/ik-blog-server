const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '分类名称不能为空'],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    image: {
        type: String
    },
    articleCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// 添加索引以提升查询性能
categorySchema.index({ parentId: 1 });
categorySchema.index({ name: 'text', description: 'text' }); // 支持全文搜索

module.exports = mongoose.model('Category', categorySchema); 
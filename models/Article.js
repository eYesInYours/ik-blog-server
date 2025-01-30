const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    cover: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['draft', 'online', 'offline', 'published'],    // 草稿、上架、下架、已发布
        default: 'published'
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorAvatar: {
        type: String,
        default: function() {
            return this.author.avatar;
        }
    },
    tags: [{
        type: String,
        trim: true
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    collections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // 草稿ID，指向草稿版本
    draftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    },
    // 原文ID，如果当前是草稿则指向原文
    originalArticleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    },
    // 是否为草稿版本
    isDraft: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Article', articleSchema); 
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
    cover: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'disabled'],
        default: 'active'
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Article', articleSchema); 
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
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
    content: {
        type: String,
        required: true
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetType',
        required: true
    },
    targetType: {
        type: String,
        required: true,
        enum: ['Article', 'Diary']
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Comment', commentSchema); 
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
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comment', commentSchema); 
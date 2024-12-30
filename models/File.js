const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalname: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('File', fileSchema); 
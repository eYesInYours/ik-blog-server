const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: false,
        default: '',
        trim: true
    },
    order: {
        type: Number,
        default: 0  // 排序顺序，数字越小越靠前
    },
    status: {
        type: String,
        enum: ['active', 'disabled'],
        default: 'active'
    },
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

module.exports = mongoose.model('Banner', bannerSchema); 
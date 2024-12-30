const mongoose = require('mongoose');

// 定义访问记录模型
const visitSchema = new mongoose.Schema({
    // 记录访问者的IP地址
    ip: {
        type: String,
        required: true
    },
    // 记录访问者的用户代理信息（浏览器、操作系统等）
    userAgent: {
        type: String,
        required: true
    },
    // 记录访问的路径（例如：/api/articles）
    path: {
        type: String,
        required: true
    },
    // 记录访问的时间戳，默认为当前时间
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// 导出访问记录模型
module.exports = mongoose.model('Visit', visitSchema); 
const Visit = require('../models/Visit');

const visitLogger = async (req, res, next) => {
    try {
        // 确保即使没有 user-agent 也能记录访问
        const visit = new Visit({
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent') || 'Unknown', // 添加默认值
            timestamp: new Date()
        });
        
        await visit.save();
        next();
    } catch (error) {
        console.error('访问记录失败:', error);
        // 即使记录失败也继续处理请求
        next();
    }
};

module.exports = visitLogger; 
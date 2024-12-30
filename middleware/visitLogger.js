const Visit = require('../models/Visit');
const chalk = require('chalk');

const visitLogger = async (req, res, next) => {
    try {
        // 获取客户端IP
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        // 获取用户代理
        const userAgent = req.headers['user-agent'];
        
        // 获取访问路径
        const path = req.originalUrl;

        // 记录访问
        const visit = new Visit({
            ip,
            userAgent,
            path,
            timestamp: new Date()
        });

        await visit.save();
        console.log(chalk.blue(`记录访问: ${path} from ${ip}`));
    } catch (error) {
        console.error(chalk.red('记录访问失败:'), error);
    }

    next();
};

module.exports = visitLogger; 
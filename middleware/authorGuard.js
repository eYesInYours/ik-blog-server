const User = require('../models/User');
const chalk = require('chalk');
const { CLIENT_ERROR } = require('../constants/httpStatus');

const authorGuard = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.isAuthor) {
            console.log(chalk.yellow('非作者访问管理接口:', req.originalUrl));
            return res.status(CLIENT_ERROR.FORBIDDEN).json({
                message: '只有博主才能访问此接口'
            });
        }

        next();
    } catch (error) {
        console.error(chalk.red('作者验证错误:'), error);
        res.status(CLIENT_ERROR.FORBIDDEN).json({
            message: '作者验证失败'
        });
    }
};

module.exports = authorGuard; 
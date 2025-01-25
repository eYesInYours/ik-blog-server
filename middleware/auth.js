const jwt = require('jsonwebtoken');
const chalk = require('chalk');
const User = require('../models/User');
const { CLIENT_ERROR } = require('../constants/httpStatus');

// 定义认证错误类型
const AUTH_ERRORS = {
    TOKEN_MISSING: 'TOKEN_MISSING',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    TOKEN_VERIFICATION_FAILED: 'TOKEN_VERIFICATION_FAILED'
};

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            console.log(chalk.yellow('认证失败: 未提供 Authorization 头'));
            return res.status(CLIENT_ERROR.UNAUTHORIZED).json({ 
                message: '未提供认证令牌',
                error: AUTH_ERRORS.TOKEN_MISSING
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            console.log(chalk.yellow('认证失败: 令牌为空'));
            return res.status(CLIENT_ERROR.UNAUTHORIZED).json({ 
                message: '未提供认证令牌',
                error: AUTH_ERRORS.TOKEN_MISSING
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 从数据库获取完整的用户信息
            const user = await User.findById(decoded.userId).select('-password');
            if (!user) {
                return res.status(CLIENT_ERROR.UNAUTHORIZED).json({
                    message: '用户不存在',
                    error: AUTH_ERRORS.TOKEN_INVALID
                });
            }
            
            req.user = user;  // 存储完整的用户信息
            console.log(chalk.green('认证成功, 用户:', user.username));
            next();
        } catch (jwtError) {
            console.log(chalk.yellow('JWT验证失败:', jwtError.message));
            
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(CLIENT_ERROR.TOKEN_EXPIRED).json({
                    code: CLIENT_ERROR.TOKEN_EXPIRED,
                    message: '认证令牌已过期',
                    error: AUTH_ERRORS.TOKEN_EXPIRED
                });
            }
            
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(CLIENT_ERROR.UNAUTHORIZED).json({
                    code: CLIENT_ERROR.UNAUTHORIZED,
                    message: '无效的认证令牌',
                    error: AUTH_ERRORS.TOKEN_INVALID
                });
            }
            
            return res.status(CLIENT_ERROR.UNAUTHORIZED).json({
                message: '令牌验证失败',
                error: AUTH_ERRORS.TOKEN_VERIFICATION_FAILED
            });
        }
    } catch (error) {
        console.error(chalk.red('认证失败:'), error.message);
        res.status(CLIENT_ERROR.UNAUTHORIZED).json({ 
            message: '认证失败',
            error: AUTH_ERRORS.TOKEN_VERIFICATION_FAILED,
            details: error.message
        });
    }
};

module.exports = {
    auth,
    AUTH_ERRORS
}; 
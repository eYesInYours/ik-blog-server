const { CLIENT_ERROR } = require('../constants/httpStatus');

// 检查用户是否是作者的中间件
const authorOnly = (req, res, next) => {
    // 确保用户已登录且是作者
    if (!req.user?.roles?.includes('writer')) {
        return res.status(CLIENT_ERROR.FORBIDDEN).json({
            code: CLIENT_ERROR.FORBIDDEN,
            message: '只有作者才能执行此操作'
        });
    }
    next();
};

module.exports = authorOnly; 
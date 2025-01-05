/**
 * 统一响应格式处理工具
 */

const { SUCCESS } = require('../constants/httpStatus');

// 成功响应
exports.success = (data = null, message = 'success') => ({
    code: SUCCESS.OK,
    data,
    message
});

// 错误响应
exports.error = (code, message = 'error', data = null) => ({
    code,
    message,
    data
}); 
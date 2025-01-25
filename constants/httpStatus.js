// HTTP 状态码
exports.SUCCESS = {
    OK: 200,           // 成功
    CREATED: 200,      // 创建成功
};

exports.CLIENT_ERROR = {
    BAD_REQUEST: 400,    // 请求错误
    UNAUTHORIZED: 401,   // 未授权(未登录)
    TOKEN_EXPIRED: 419,  // 令牌过期(特殊状态码)
    FORBIDDEN: 403,      // 禁止访问
    NOT_FOUND: 404,      // 资源不存在
    CONFLICT: 409,       // 资源冲突
    REQUEST_TIMEOUT: 408 // 请求超时
};

exports.SERVER_ERROR = {
    INTERNAL_ERROR: 500, // 服务器内部错误
    NOT_IMPLEMENTED: 501,// 服务未实现
    BAD_GATEWAY: 502,    // 网关错误
    SERVICE_UNAVAILABLE: 503, // 服务不可用
    GATEWAY_TIMEOUT: 504, // 网关超时
    HTTP_VERSION_NOT_SUPPORTED: 505 // HTTP版本不支持
}; 
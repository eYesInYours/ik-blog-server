## 课时管理 API

### 获取课时列表
- 路径: GET /api/lessons
- 权限: 公开
- 查询参数:
  - page: 页码，默认1
  - limit: 每页数量，默认10 
  - keyword: 搜索关键词，匹配课时名称和描述
  - status: 课时状态筛选
- 响应:
```json
{
  "code": 200,
  "data": {
    "lessons": [{
      "_id": "课时ID",
      "name": "课时名称",
      "totalMinutes": 60,
      "totalSessions": 10,
      "minutesPerSession": 6,
      "price": 100,
      "description": "课时描述",
      "cover": "封面图片",
      "status": "active",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10
    }
  }
}
```

### 创建课时
- 路径: POST /api/lessons
- 权限: 需要管理员权限
- 请求头:
```
Authorization: Bearer <token>
```
- 请求体:
```json
{
  "name": "课时名称",
  "totalMinutes": 60,
  "totalSessions": 10,
  "minutesPerSession": 6,
  "price": 100,
  "description": "课时描述",
  "cover": "封面图片URL"
}
```
- 响应:
```json
{
  "code": 200,
  "message": "课时创建成功",
  "data": {
    // 创建的课时信息
  }
}
```

### 获取课时详情
- 路径: GET /api/lessons/:id
- 权限: 公开
- 参数:
  - id: 课时ID (路径参数)
- 响应:
```json
{
  "code": 200,
  "data": {
    "_id": "课时ID",
    "name": "课时名称",
    "totalMinutes": 60,
    "totalSessions": 10,
    "minutesPerSession": 6,
    "price": 100,
    "description": "课时描述",
    "cover": "封面图片",
    "status": "active",
    "createdAt": "创建时间",
    "updatedAt": "更新时间"
  }
}
```

### 更新课时
- 路径: PUT /api/lessons/:id
- 权限: 需要管理员权限
- 请求头:
```
Authorization: Bearer <token>
```
- 参数:
  - id: 课时ID (路径参数)
- 请求体: (所有字段都是选填)
```json
{
  "name": "新课时名称",
  "totalMinutes": 90,
  "totalSessions": 15,
  "minutesPerSession": 6,
  "price": 150,
  "description": "新课时描述",
  "cover": "新封面图片URL",
  "status": "active"
}
```
- 响应:
```json
{
  "code": 200,
  "message": "课时更新成功",
  "data": {
    // 更新后的课时信息
  }
}
```

### 删除课时
- 路径: DELETE /api/lessons/:id
- 权限: 需要管理员权限
- 请求头:
```
Authorization: Bearer <token>
```
- 参数:
  - id: 课时ID (路径参数)
- 响应:
```json
{
  "code": 200,
  "message": "课时删除成功"
}
```

## 订单管理 API

### 获取订单列表
- 路径: GET /api/lesson-orders
- 权限: 需要管理员权限
- 查询参数:
  - page: 页码，默认1
  - limit: 每页数量，默认10
  - status: 订单状态筛选
- 响应:
```json
{
  "code": 200,
  "data": {
    "orders": [{
      "_id": "订单ID",
      "userId": {
        "_id": "用户ID",
        "username": "用户名",
        "email": "邮箱"
      },
      "lessonId": {
        "_id": "课时ID",
        "name": "课时名称"
      },
      "sessions": 10,
      "remainingSessions": 8,
      "amount": 1000,
      "status": "paid",
      "createdAt": "创建时间",
      "paidAt": "支付时间"
    }],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10
    }
  }
}
```

### 创建订单
- 路径: POST /api/lesson-orders
- 权限: 需要登录
- 请求头:
```
Authorization: Bearer <token>
```
- 请求体:
```json
{
  "lessonId": "课时ID",
  "sessions": 10
}
```
- 响应:
```json
{
  "code": 200,
  "message": "订单创建成功",
  "data": {
    // 创建的订单信息
  }
}
```

### 获取订单详情
- 路径: GET /api/lesson-orders/:id
- 权限: 需要订单所有者或管理员权限
- 参数:
  - id: 订单ID (路径参数)
- 响应:
```json
{
  "code": 200,
  "data": {
    "_id": "订单ID",
    "userId": {
      "_id": "用户ID",
      "username": "用户名",
      "email": "邮箱"
    },
    "lessonId": {
      "_id": "课时ID", 
      "name": "课时名称"
    },
    "sessions": 10,
    "remainingSessions": 8,
    "amount": 1000,
    "status": "paid",
    "createdAt": "创建时间",
    "paidAt": "支付时间"
  }
}
```

### 支付订单
- 路径: POST /api/lesson-orders/:id/pay
- 权限: 需要订单所有者权限
- 请求头:
```
Authorization: Bearer <token>
```
- 参数:
  - id: 订单ID (路径参数)
- 响应:
```json
{
  "code": 200,
  "message": "支付成功",
  "data": {
    // 更新后的订单信息
  }
}
```

### 取消订单
- 路径: POST /api/lesson-orders/:id/cancel
- 权限: 需要订单所有者或管理员权限
- 请求头:
```
Authorization: Bearer <token>
```
- 参数:
  - id: 订单ID (路径参数)
- 响应:
```json
{
  "code": 200,
  "message": "订单取消成功"
}
```

### 获取用户订单列表
- 路径: GET /api/users/:userId/lesson-orders
- 权限: 需要用户本人或管理员权限
- 参数:
  - userId: 用户ID (路径参数)
- 查询参数:
  - page: 页码，默认1
  - limit: 每页数量，默认10
  - status: 订单状态筛选
- 响应:
```json
{
  "code": 200,
  "data": {
    "orders": [{
      // 订单信息
    }],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10
    }
  }
}
```

### 错误响应
所有接口的错误响应格式：
```json
{
  "code": 400/401/403/404/500,
  "message": "错误描述信息"
}
```

常见错误码：
- 400: 请求参数错误
- 401: 未登录或token无效
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误 
## 分类管理 API

### 创建分类
- 路径: POST /api/categories
- 权限: 需要作者权限
- 请求头: 
  ```
  Authorization: Bearer <token>
  ```
- 请求体:
  ```json
  {
    "name": "分类名称",        // 必填，字符串，唯一
    "description": "分类描述",  // 选填，字符串
    "parentId": "父分类ID",    // 选填，ObjectId字符串
    "image": "分类图片URL"     // 选填，字符串
  }
  ```
- 响应:
  ```json
  {
    "code": 201,
    "message": "分类创建成功",
    "data": {
      "_id": "分类ID",
      "name": "分类名称",
      "description": "分类描述",
      "parentId": "父分类ID",
      "image": "分类图片URL",
      "articleCount": 0,
      "createdBy": "创建者ID",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  }
  ```

### 获取分类列表
- 路径: GET /api/categories
- 权限: 公开
- 查询参数:
  - page: 页码，默认1
  - pageSize: 每页数量，默认10
  - sort: 排序方式，默认"-createdAt"，示例："-createdAt"(最新)，"name"(名称升序)
  - keyword: 搜索关键词，会匹配名称和描述
- 响应:
  ```json
  {
    "code": 200,
    "data": {
      "categories": [
        {
          "_id": "分类ID",
          "name": "分类名称",
          "description": "分类描述",
          "parentId": {
            "_id": "父分类ID",
            "name": "父分类名称"
          },
          "image": "分类图片URL",
          "articleCount": 0,
          "createdBy": {
            "_id": "用户ID",
            "username": "用户名"
          },
          "createdAt": "创建时间",
          "updatedAt": "更新时间"
        }
      ],
      "pagination": {
        "total": 100,
        "page": 1,
        "pageSize": 10,
        "totalPages": 10
      }
    }
  }
  ```

### 获取分类详情
- 路径: GET /api/categories/:id
- 权限: 公开
- 参数: 
  - id: 分类ID (路径参数)
- 响应:
  ```json
  {
    "code": 200,
    "data": {
      "_id": "分类ID",
      "name": "分类名称",
      "description": "分类描述",
      "parentId": {
        "_id": "父分类ID",
        "name": "父分类名称"
      },
      "image": "分类图片URL",
      "articleCount": 0,
      "createdBy": {
        "_id": "用户ID",
        "username": "用户名"
      },
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  }
  ```

### 更新分类
- 路径: PUT /api/categories/:id
- 权限: 需要作者权限
- 请求头:
  ```
  Authorization: Bearer <token>
  ```
- 参数:
  - id: 分类ID (路径参数)
- 请求体: (所有字段都是选填)
  ```json
  {
    "name": "新分类名称",
    "description": "新分类描述",
    "parentId": "新父分类ID",
    "image": "新分类图片URL"
  }
  ```
- 响应:
  ```json
  {
    "code": 200,
    "message": "分类更新成功",
    "data": {
      // 更新后的分类完整信息
    }
  }
  ```

### 删除分类
- 路径: DELETE /api/categories/:id
- 权限: 需要作者权限
- 请求头:
  ```
  Authorization: Bearer <token>
  ```
- 参数:
  - id: 分类ID (路径参数)
- 响应:
  ```json
  {
    "code": 200,
    "message": "分类删除成功"
  }
  ```

### 获取分类下的文章列表
- 路径: GET /api/categories/:id/articles
- 权限: 公开
- 参数:
  - id: 分类ID (路径参数)
- 查询参数:
  - page: 页码，默认1
  - pageSize: 每页数量，默认10
  - sort: 排序方式，默认"-createdAt"
- 响应:
  ```json
  {
    "code": 200,
    "data": {
      "articles": [
        {
          "_id": "文章ID",
          "title": "文章标题",
          "author": {
            "_id": "作者ID",
            "username": "作者名",
            "avatar": "作者头像"
          },
          // 其他文章字段...
        }
      ],
      "pagination": {
        "total": 100,
        "page": 1,
        "pageSize": 10,
        "totalPages": 10
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
- 400: 请求参数错误（如分类名已存在、父分类不存在等）
- 401: 未登录或token无效
- 403: 无权限（非作者用户）
- 404: 资源不存在（如分类不存在）
- 500: 服务器内部错误 

### 验证码接口

#### 获取验证码
- 路径: GET /api/captcha
- 权限: 公开
- 响应: 返回 SVG 格式的验证码图片
- 响应头:
  ```
  Content-Type: image/svg+xml
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0
  ```

#### 验证验证码
- 路径: POST /api/captcha/verify
- 权限: 公开
- 请求体:
  ```json
  {
    "captcha": "用户输入的验证码"
  }
  ```
- 响应:
  ```json
  {
    "code": 200,
    "data": {
      "valid": true  // 或 false
    }
  }
  ```

注意事项：
1. 验证码不区分大小写
2. 验证码在验证后会立即失效
3. 验证码有效期为会话期间
4. 每次请求验证码接口都会生成新的验证码 
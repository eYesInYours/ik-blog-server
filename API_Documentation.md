# API 接口文档

## 管理接口

### 文章管理

#### 获取所有文章（管理）
- **URL**: `/api/articles/admin/all`
- **方法**: `GET`
- **认证**: 必须
- **查询参数**:
  - `page`: 页码（默认：1）
  - `limit`: 每页数量（默认：10）
  - `keyword`: 搜索关键词（可选）
  - `status`: 文章状态筛选（active/disabled）
  - `startDate`: 开始日期（YYYY-MM-DD）
  - `endDate`: 结束日期（YYYY-MM-DD）
  - `tags`: 标签筛选（单个标签或逗号分隔的多个标签）
  - `sortBy`: 排序字段（createdAt/updatedAt/title）
  - `sortOrder`: 排序方式（asc/desc）
- **成功响应**:
  ```json
  {
    "articles": [
      {
        "_id": "文章ID",
        "title": "文章标题",
        "content": "文章内容",
        "status": "文章状态",
        "tags": ["标签1", "标签2"],
        "author": {
          "_id": "作者ID",
          "username": "作者名称",
          "avatar": "作者头像"
        },
        "createdAt": "创建时间",
        "updatedAt": "更新时间"
      }
    ],
    "pagination": {
      "total": 100,
      "totalPages": 10,
      "currentPage": 1,
      "limit": 10
    }
  }
  ```

#### 更新文章状态
- **URL**: `/api/articles/admin/:id/status`
- **方法**: `PUT`
- **认证**: 必须
- **请求体**:
  ```json
  {
    "status": "active/disabled"
  }
  ```
- **成功响应**:
  ```json
  {
    "message": "文章状态更新成功",
    "article": {
      "_id": "文章ID",
      "title": "文章标题",
      "status": "新状态",
      "author": {
        "_id": "作者ID",
        "username": "作者名称",
        "avatar": "作者头像"
      }
    }
  }
  ```

#### 批量删除文章
- **URL**: `/api/articles/admin/batch-delete`
- **方法**: `POST`
- **认证**: 必须
- **请求体**:
  ```json
  {
    "ids": ["文章ID1", "文章ID2", ...]
  }
  ```
- **成功响应**:
  ```json
  {
    "message": "文章批量删除成功",
    "deletedCount": 2
  }
  ```

### 用户管理

#### 获取所有用户（管理）
- **URL**: `/api/users/admin/all`
- **方法**: `GET`
- **认证**: 必须
- **查询参数**:
  - `page`: 页码（默认：1）
  - `limit`: 每页数量（默认：10）
  - `keyword`: 搜索关键词（可选）
- **成功响应**:
  ```json
  {
    "users": [
      {
        "_id": "用户ID",
        "username": "用户名",
        "email": "邮箱",
        "avatar": "头像",
        "status": "状态",
        "createdAt": "创建时间"
      }
    ],
    "pagination": {
      "total": 100,
      "totalPages": 10,
      "currentPage": 1,
      "limit": 10
    }
  }
  ```

#### 更新用户状态
- **URL**: `/api/users/admin/:userId/status`
- **方法**: `PUT`
- **认证**: 必须
- **请求体**:
  ```json
  {
    "status": "active/disabled"
  }
  ```
- **成功响应**:
  ```json
  {
    "message": "用户状态更新成功",
    "user": {
      "_id": "用户ID",
      "username": "用户名",
      "status": "新状态"
    }
  }
  ```

### 评论管理

#### 获取所有评论（管理）
- **URL**: `/api/comments/admin/all`
- **方法**: `GET`
- **认证**: 必须
- **查询参数**:
  - `page`: 页码（默认：1）
  - `limit`: 每页数量（默认：10）
  - `keyword`: 搜索关键词（可选）
- **成功响应**:
  ```json
  {
    "comments": [
      {
        "_id": "评论ID",
        "content": "评论内容",
        "author": {
          "_id": "作者ID",
          "username": "作者名称",
          "avatar": "作者头像"
        },
        "article": {
          "_id": "文章ID",
          "title": "文章标题"
        },
        "createdAt": "创建时间"
      }
    ],
    "pagination": {
      "total": 100,
      "totalPages": 10,
      "currentPage": 1,
      "limit": 10
    }
  }
  ```

### 统计接口

#### 获取统计数据
- **URL**: `/api/statistics`
- **方法**: `GET`
- **认证**: 必须
- **查询参数**:
  - `period`: 统计周期（24hours/7days/30days，默认：7days）
- **成功响应**:
  ```json
  {
    "dates": ["2024-03-01", "2024-03-02", ...],
    "visits": [100, 120, ...],
    "users": [5, 8, ...],
    "articles": [10, 12, ...],
    "comments": [20, 25, ...],
    "totals": {
      "articles": 100,
      "users": 50,
      "comments": 200,
      "visits": 1000
    }
  }
  ```
- **说明**:
  - `dates`: 日期数组
  - `visits`: 每日访问量
  - `users`: 每日新增用户数
  - `articles`: 每日新增文章数
  - `comments`: 每日新增评论数
  - `totals`: 总计数据

### 轮播图接口

#### 获取轮播图列表（前台展示）
- **URL**: `/api/banners`
- **方法**: `GET`
- **认证**: 不需要
- **成功响应**:
  ```json
  [
    {
      "_id": "轮播图ID",
      "title": "标题",
      "image": "图片URL",
      "link": "跳转链接",
      "order": 0,
      "status": "active",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  ]
  ```

#### 获取所有轮播图（管理）
- **URL**: `/api/banners/admin/all`
- **方法**: `GET`
- **认证**: 必须
- **查询参数**:
  - `page`: 页码（默认：1）
  - `limit`: 每页数量（默认：10）
  - `keyword`: 搜索关键词（可选）
- **成功响应**:
  ```json
  {
    "banners": [
      {
        "_id": "轮播图ID",
        "title": "标题",
        "image": "图片URL",
        "link": "跳转链接",
        "order": 0,
        "status": "active",
        "createdAt": "创建时间",
        "updatedAt": "更新时间"
      }
    ],
    "pagination": {
      "total": 100,
      "totalPages": 10,
      "currentPage": 1,
      "limit": 10
    }
  }
  ```

#### 创建轮播图
- **URL**: `/api/banners`
- **方法**: `POST`
- **认证**: 必须
- **请求体**:
  ```json
  {
    "title": "轮播图标题",
    "image": "图片URL",
    "link": "跳转链接（可选）",
    "order": 0
  }
  ```

#### 更新轮播图
- **URL**: `/api/banners/:id`
- **方法**: `PUT`
- **认证**: 必须
- **请求体**:
  ```json
  {
    "title": "新标题",
    "image": "新图片URL",
    "link": "新跳转链接（可选，传空字符串可清除）",
    "order": 1,
    "status": "active/disabled"
  }
  ```

#### 删除轮播图
- **URL**: `/api/banners/:id`
- **方法**: `DELETE`
- **认证**: 必须
// 根据环境加载对应的配置文件
require('dotenv').config({
    path: process.env.NODE_ENV === 'production' 
        ? '.env.production' 
        : '.env.development'
});

// 打印环境变量用于调试
console.log('当前环境:', process.env.NODE_ENV);
console.log('MongoDB URI:', process.env.MONGODB_URI);
console.log('API Base:', process.env.API_BASE);

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const visitLogger = require('./middleware/visitLogger');
const { SERVER_ERROR, CLIENT_ERROR } = require('./constants/httpStatus');
const session = require('express-session');

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log(chalk.green('创建 uploads 目录成功'));
}

// 初始化 Express 应用
const app = express();

// session 中间件配置 - 放在其他中间件之前
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000 // 5分钟过期
    }
}));

// 连接数据库
connectDB();

// API 基础路径
const API_BASE = process.env.API_BASE

// 跨域配置
app.use((req, res, next) => {
    // 允许特定域名访问
    // const allowedOrigins = [
    //     'http://localhost:3010',
    //     'http://localhost:3333',
    //     'http://159.75.125.36:3010',
    //     'http://159.75.125.36:3333',
    //     'https://restapi.amap.com'
    // ];
    // const origin = req.headers.origin;
    // if (allowedOrigins.includes(origin)) {
    // }
    
    res.header('Access-Control-Allow-Origin', '*');
    // 允许携带认证信息
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 访问记录中间件
app.use(visitLogger);

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// API 路由
const apiRouter = express.Router();
apiRouter.use('/auth', require('./routes/auth'));
apiRouter.use('/users', require('./routes/users'));
apiRouter.use('/articles', require('./routes/articles'));
apiRouter.use('/comments', require('./routes/comments'));
apiRouter.use('/files', require('./routes/files'));
apiRouter.use('/statistics', require('./routes/statistics'));
apiRouter.use('/banners', require('./routes/banners'));
apiRouter.use('/captcha', require('./routes/captcha'));
apiRouter.use('/categories', require('./routes/categories'));
apiRouter.use('/diaries', require('./routes/diary'));
apiRouter.use('/notifications', require('./routes/notifications'));
// 挂载 API 路由到 /api 路径
app.use('/api', apiRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(chalk.red('全局错误处理:'), err);
    if (err.message === '不允许的域名') {
        return res.status(CLIENT_ERROR.FORBIDDEN).json({ 
            message: '不允许的跨域请求' 
        });
    }
    if (err instanceof multer.MulterError) {
        return res.status(CLIENT_ERROR.BAD_REQUEST).json({ 
            message: '文件上传错误: ' + err.message 
        });
    }
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
        message: '服务器内部错误' 
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`服务器运行在端口 ${PORT}`));
}); 
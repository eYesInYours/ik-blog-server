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
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const visitLogger = require('./middleware/visitLogger');
const { SERVER_ERROR, CLIENT_ERROR } = require('./constants/httpStatus');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log(chalk.green('创建 uploads 目录成功'));
}

// 初始化 Express 应用
const app = express();

// 在所有中间件之前添加信任代理配置
app.set('trust proxy', 1);

// CORS 配置
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = process.env.NODE_ENV === 'production'
            ? [
                'http://ikchen.top',
                'http://www.ikchen.top',
                'http://admin.ikchen.top',
                'http://39.108.121.16'
              ]
            : ['http://localhost:3010', 'http://localhost:3333'];
        
        // 打印调试信息
        console.log('Request Origin:', origin);
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('不允许的域名:', origin);
            callback(new Error('不允许的域名'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'RefreshToken', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
}));

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 5 * 60 // 5分钟过期
    }),
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 5 * 60 * 1000, // 5分钟
        sameSite: 'lax'
    }
}));

// 调试中间件 - 添加更多信息
app.use((req, res, next) => {
    console.log('=== Request Debug ===');
    console.log('URL:', req.url);
    console.log('Origin:', req.headers.origin);
    console.log('Host:', req.headers.host);
    console.log('Cookie:', req.headers.cookie);
    console.log('Session:', req.session);
    console.log('===================');
    console.log('\t')
    next();
});

// 访问日志中间件
app.use(visitLogger);

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
apiRouter.use('/lessons', require('./routes/lesson'));
apiRouter.use('/students', require('./routes/student'));
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

// 连接数据库
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`服务器运行在端口 ${PORT}`));
    console.log(chalk.blue(`环境: ${process.env.NODE_ENV}`));
}); 
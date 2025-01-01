require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const visitLogger = require('./middleware/visitLogger');
const { SERVER_ERROR, CLIENT_ERROR } = require('./constants/httpStatus');

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log(chalk.green('创建 uploads 目录成功'));
}

// 初始化 Express 应用
const app = express();

// 连接数据库
connectDB();

// CORS 配置
const corsOptions = {
    origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3010'
        : 'http://159.75.125.36:3010',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 访问记录中间件
app.use(visitLogger);

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/files', require('./routes/files'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/banners', require('./routes/banners'));

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
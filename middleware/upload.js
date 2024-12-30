const multer = require('multer');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log(chalk.green('创建 uploads 目录成功'));
}

// 自定义错误处理
const handleMulterError = (err, req, res, next) => {
    console.error(chalk.red('文件上传错误:'), err);
    console.log('请求头:', JSON.stringify(req.headers, null, 2));
    console.log('请求体:', JSON.stringify(req.body, null, 2));
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: '文件上传错误: ' + err.message });
    }
    next(err);
};

// 配置存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('处理文件上传，文件信息:', JSON.stringify(file, null, 2));
        console.log('请求头:', JSON.stringify(req.headers, null, 2));
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        console.log(chalk.blue('生成文件名:', uniqueSuffix + path.extname(file.originalname)));
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        console.log(chalk.green('文件类型验证通过:', file.originalname));
        cb(null, true);
    } else {
        console.log(chalk.yellow('不支持的文件类型:', file.mimetype));
        cb(new Error('不支持的文件类型'), false);
    }
};

// 创建 multer 实例，添加错误处理
const uploadMiddleware = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制文件大小为 5MB
    }
});

// 导出包含错误处理的中间件
module.exports = {
    upload: uploadMiddleware,
    handleMulterError
}; 
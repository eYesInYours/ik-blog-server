const File = require('../models/File');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');

// 上传文件
exports.uploadFile = async (req, res) => {
    try {
        console.log(chalk.blue('文件上传请求开始'));
        console.log('请求体:', JSON.stringify(req.body, null, 2));
        console.log('文件信息:', req.file ? JSON.stringify(req.file, null, 2) : '无文件');

        if (!req.file) {
            console.log(chalk.yellow('上传失败: 没有文件'));
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({ message: '没有文件被上传' });
        }

        const file = new File({
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            path: req.file.path,
            size: req.file.size,
            uploadedBy: req.user.userId,
            article: req.body.articleId || null
        });

        await file.save();

        console.log(chalk.green('文件上传成功:', file.originalname));
        res.status(SUCCESS.CREATED).json({
            message: '文件上传成功',
            file: {
                id: file._id,
                filename: file.filename,
                originalname: file.originalname,
                size: file.size,
                url: `/uploads/${file.filename}`
            }
        });
    } catch (error) {
        console.error(chalk.red('文件上传错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ message: '文件上传失败' });
    }
};

// 获取文件信息
exports.getFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id)
            .populate('uploadedBy', 'username');

        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        res.json(file);
    } catch (error) {
        console.error('获取文件信息错误:', error);
        res.status(500).json({ message: '获取文件信息失败' });
    }
};

// 下载文件
exports.downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        const filePath = path.join(__dirname, '..', file.path);

        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: '文件不存在于服务器' });
        }

        // 设置响应头
        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(file.originalname)}`);

        // 创建文件流并发送
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('文件下载错误:', error);
        res.status(500).json({ message: '文件下载失败' });
    }
};

// 删除文件
exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        // 检查权限
        if (file.uploadedBy.toString() !== req.user.userId) {
            return res.status(403).json({ message: '没有权限删除此文件' });
        }

        // 删除物理文件
        const filePath = path.join(__dirname, '..', file.path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 删除数据库记录
        await file.deleteOne();

        res.json({ message: '文件删除成功' });
    } catch (error) {
        console.error('删除文件错误:', error);
        res.status(500).json({ message: '删除文件失败' });
    }
}; 
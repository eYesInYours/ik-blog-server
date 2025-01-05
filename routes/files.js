const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { auth } = require('../middleware/auth');
const authorOnly = require('../middleware/authorOnly');
const { upload, handleMulterError } = require('../middleware/upload');

// 上传文件（需要作者权限）
router.post('/upload', 
    auth, 
    authorOnly,
    upload.single('file'), 
    handleMulterError,
    fileController.uploadFile
);

// 获取文件信息
router.get('/:id', fileController.getFile);

// 下载文件（需要认证）
router.get('/download/:id', auth, fileController.downloadFile);

// 删除文件（需要作者权限）
router.delete('/:id', auth, authorOnly, fileController.deleteFile);

module.exports = router; 
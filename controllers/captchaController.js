const svgCaptcha = require('svg-captcha');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');

// 生成验证码
exports.getCaptcha = (req, res) => {
    try {
        // 生成验证码
        const captcha = svgCaptcha.create({
            size: 4,           // 验证码长度
            noise: 2,          // 干扰线条数
            color: true,       // 验证码字符将有不同的颜色
            background: '#f0f2f5', // 背景色
            width: 100,        // 宽度
            height: 40,        // 高度
            fontSize: 40       // 字体大小
        });

        // 将验证码文本存储到会话中，用于后续验证
        req.session.captcha = captcha.text.toLowerCase();

        // 将SVG转换为base64
        const base64Image = Buffer.from(captcha.data).toString('base64');
        const imageUrl = `data:image/svg+xml;base64,${base64Image}`;
        
        res.json(success({
            imageUrl
        }, '验证码生成成功'));
    } catch (err) {
        console.error('生成验证码错误:', err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '生成验证码失败')
        );
    }
};

// 验证用户输入的验证码
exports.verifyCaptcha = (req, res) => {
    try {
        const captchaText = typeof req.body === 'string' ? req.body : req.body.captcha;
        console.log('收到的验证码:', captchaText);

        // 检查会话中是否有验证码
        if (!req.session.captcha) {
            return res.status(400).json(
                error(CLIENT_ERROR.BAD_REQUEST, '验证码已过期，请重新获取')
            );
        }

        // 检查是否提供了验证码
        if (!captchaText) {
            return res.status(400).json(
                error(CLIENT_ERROR.BAD_REQUEST, '请输入验证码')
            );
        }

        // 比较用户输入的验证码和会话中存储的验证码（不区分大小写）
        const isValid = captchaText.toLowerCase() === req.session.captcha;
        
        // 验证完后立即删除会话中的验证码，防止重复使用
        delete req.session.captcha;

        // 如果验证失败，返回错误
        if (!isValid) {
            return res.status(400).json(
                error(CLIENT_ERROR.BAD_REQUEST, '验证码错误')
            );
        }

        // 验证成功
        res.json(success({
            valid: true
        }, '验证码验证成功'));
    } catch (err) {
        console.error('验证码验证错误:', err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '验证码验证失败')
        );
    }
}; 
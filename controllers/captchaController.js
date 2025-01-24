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

        // 将验证码文本存储到会话中
        req.session.captcha = captcha.text.toLowerCase();
        
        // 打印调试信息
        console.log('生成验证码:', req.session.captcha);
        console.log('Session ID:', req.sessionID);
        console.log('完整的 Session:', req.session);

        // 确保 session 被保存
        req.session.save((err) => {
            if (err) {
                console.error('Session 保存错误:', err);
                return res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '验证码生成失败'));
            }

            const base64Image = Buffer.from(captcha.data).toString('base64');
            const imageUrl = `data:image/svg+xml;base64,${base64Image}`;
            
            res.json(success({
                imageUrl
            }, '验证码生成成功'));
        });
    } catch (err) {
        console.error('生成验证码错误:', err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '生成验证码失败'));
    }
};

// 验证用户输入的验证码
exports.verifyCaptcha = (req, res) => {
    try {
        const captchaText = typeof req.body === 'string' ? req.body : req.body.code;
        console.log('收到的验证码:', captchaText);
        console.log('会话中的验证码:', req.session.captcha);
        console.log('Session ID:', req.sessionID);
        console.log('完整的 Session:', req.session);

        // 检查会话中是否有验证码
        if (!req.session.captcha) {
            return res.status(400).json({
                code: 400,
                message: '验证码已过期，请重新获取'
            });
        }

        // 比较验证码（不区分大小写）
        const isValid = captchaText.toLowerCase() === req.session.captcha.toLowerCase();
        
        // 验证完后删除会话中的验证码
        delete req.session.captcha;

        if (!isValid) {
            return res.status(400).json({
                code: 400,
                message: '验证码错误'
            });
        }

        res.json({
            code: 200,
            message: '验证码验证成功',
            data: { valid: true }
        });
    } catch (err) {
        console.error('验证码验证错误:', err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '验证码验证失败'));
    }
}; 
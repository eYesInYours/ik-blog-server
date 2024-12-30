const User = require('../models/User');
const jwt = require('jsonwebtoken');
const chalk = require('chalk');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { TOKEN_EXPIRES_IN } = require('../constants/auth');

// 用户注册
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // 检查用户是否已存在
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(CLIENT_ERROR.CONFLICT).json({ 
                message: '用户名或邮箱已存在' 
            });
        }

        const user = new User({ username, email, password });
        await user.save();

        res.status(SUCCESS.CREATED).json({ 
            message: '注册成功' 
        });
    } catch (error) {
        console.error(chalk.red('注册错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '注册失败' 
        });
    }
};

// 用户登录
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(CLIENT_ERROR.UNAUTHORIZED).json({ 
                message: '邮箱或密码错误' 
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(CLIENT_ERROR.UNAUTHORIZED).json({ 
                message: '邮箱或密码错误' 
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error(chalk.red('登录错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '登录失败' 
        });
    }
};

// 验证令牌
exports.verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({ 
                message: '用户不存在' 
            });
        }
        res.json({ user });
    } catch (error) {
        console.error(chalk.red('令牌验证错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '令牌验证失败' 
        });
    }
};

// 刷新令牌
exports.refreshToken = async (req, res) => {
    try {
        const newToken = jwt.sign(
            { userId: req.user.userId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ token: newToken });
    } catch (error) {
        console.error(chalk.red('令牌刷新错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '令牌刷新失败' 
        });
    }
};

// 退出登录
exports.logout = async (req, res) => {
    try {
        // 这里可以添加令牌黑名单等逻辑
        res.status(SUCCESS.OK).json({ 
            message: '退出成功' 
        });
    } catch (error) {
        console.error(chalk.red('退出登录错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '退出失败' 
        });
    }
}; 
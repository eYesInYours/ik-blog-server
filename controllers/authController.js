const User = require('../models/User');
const jwt = require('jsonwebtoken');
const chalk = require('chalk');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { TOKEN_EXPIRES_IN } = require('../constants/auth');

// 用户注册
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // 只检查邮箱是否已存在
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(CLIENT_ERROR.CONFLICT).json({
                code: CLIENT_ERROR.CONFLICT,
                message: '该邮箱已被注册'
            });
        }

        // 检查是否存在作者
        const writerExists = await User.exists({ roles: 'writer' });

        // 如果用户名重复，自动添加随机后缀
        let finalUsername = username;
        let userWithSameUsername = await User.findOne({ username });
        if (userWithSameUsername) {
            finalUsername = `${username}_${Math.random().toString(36).slice(2, 7)}`;
        }

        const user = new User({
            username: finalUsername,
            email,
            password,
            roles: writerExists ? ['reader'] : ['writer']  // 如果还没有作者，则设置为作者角色
        });

        await user.save();

        // 生成 JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );

        res.status(SUCCESS.CREATED).json({
            code: SUCCESS.CREATED,
            message: '注册成功',
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    roles: user.roles
                }
            }
        });
    } catch (error) {
        console.error(chalk.red('注册错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            code: SERVER_ERROR.INTERNAL_ERROR,
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
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({ 
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '该账号尚未注册，请先完成注册',
                type: 'ACCOUNT_NOT_EXISTS'  // 添加一个类型标识，方便前端处理
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(CLIENT_ERROR.UNAUTHORIZED).json({ 
                code: CLIENT_ERROR.UNAUTHORIZED,
                message: '密码错误，请重试' 
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );

        res.json({
            code: SUCCESS.OK,
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    roles: user.roles
                }
            }
        });
    } catch (error) {
        console.error(chalk.red('登录错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            code: SERVER_ERROR.INTERNAL_ERROR,
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
                code: CLIENT_ERROR.NOT_FOUND,  // 404
                message: '用户不存在' 
            });
        }
        res.json({
            code: SUCCESS.OK,  // 200
            data: { user }
        });
    } catch (error) {
        console.error(chalk.red('令牌验证错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            code: SERVER_ERROR.INTERNAL_ERROR,  // 500
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
        res.json({
            code: SUCCESS.OK,  // 200
            data: { token: newToken }
        });
    } catch (error) {
        console.error(chalk.red('令牌刷新错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            code: SERVER_ERROR.INTERNAL_ERROR,  // 500
            message: '令牌刷新失败' 
        });
    }
};

// 退出登录
exports.logout = async (req, res) => {
    try {
        res.status(SUCCESS.OK).json({ 
            code: SUCCESS.OK,  // 200
            message: '退出成功' 
        });
    } catch (error) {
        console.error(chalk.red('退出登录错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            code: SERVER_ERROR.INTERNAL_ERROR,  // 500
            message: '退出失败' 
        });
    }
}; 
const User = require('../models/User');
const Article = require('../models/Article'); // 需要引入文章模型
const chalk = require('chalk');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');

// 获取用户信息
exports.getUserInfo = async (req, res) => {
    try {
        console.log(chalk.blue('获取用户信息请求, ID:', req.user._id));

        const user = await User.findById(req.user._id)
            .select('-password'); // 排除密码字段

        if (!user) {
            console.log(chalk.yellow('获取用户信息失败: 用户不存在'));
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '用户不存在')
            );
        }

        console.log(chalk.green('获取用户信息成功:', user.username));
        res.json(success(user));
    } catch (err) {
        console.error(chalk.red('获取用户信息错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取用户信息失败')
        );
    }
};

// 更新用户信息
exports.updateUserInfo = async (req, res) => {
    try {
        console.log(chalk.blue('更新用户信息请求:', req.body));
        const { username, avatar, intro } = req.body;

        // 如果要更新用户名，检查是否已存在
        if (username) {
            const existingUser = await User.findOne({ 
                username,
                _id: { $ne: req.user._id }
            });
            
            if (existingUser) {
                console.log(chalk.yellow('更新用户信息失败: 用户名已存在'));
                return res.status(400).json(
                    error(CLIENT_ERROR.BAD_REQUEST, '用户名已被使用')
                );
            }
        }

        // 更新用户信息
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { 
                $set: {
                    ...(username && { username }),
                    ...(avatar && { avatar }),
                    ...(intro && { intro })
                }
            },
            { 
                new: true, // 返回更新后的文档
                select: '-password' // 排除密码字段
            }
        );

        if (!updatedUser) {
            console.log(chalk.yellow('更新用户信息失败: 用户不存在'));
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '用户不存在')
            );
        }

        console.log(chalk.green('更新用户信息成功:', updatedUser.username));
        res.json(success(updatedUser, '用户信息更新成功'));
    } catch (err) {
        console.error(chalk.red('更新用户信息错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '更新用户信息失败')
        );
    }
};

// 修改密码
exports.changePassword = async (req, res) => {
    try {
        console.log(chalk.blue('修改密码请求'));
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            console.log(chalk.yellow('修改密码失败: 用户不存在'));
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '用户不存在')
            );
        }

        // 验证当前密码
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            console.log(chalk.yellow('修改密码失败: 当前密码错误'));
            return res.status(401).json(
                error(CLIENT_ERROR.UNAUTHORIZED, '当前密码错误')
            );
        }

        // 更新密码
        user.password = newPassword;
        await user.save();

        console.log(chalk.green('密码修改成功'));
        res.json(success(null, '密码修改成功'));
    } catch (err) {
        console.error(chalk.red('修改密码错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '修改密码失败')
        );
    }
};

// 获取所有用户（管理接口）
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '' } = req.query;

        // 构建查询条件
        const query = keyword ? {
            $or: [
                { username: new RegExp(keyword, 'i') },
                { email: new RegExp(keyword, 'i') }
            ]
        } : {};

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json(success({
            users,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        }));
    } catch (err) {
        console.error(chalk.red('获取用户列表错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取用户列表失败')
        );
    }
};

// 禁用/启用用户
exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { status } },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '用户不存在')
            );
        }

        res.json(success(user, '用户状态更新成功'));
    } catch (err) {
        console.error(chalk.red('更新用户状态错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '更新用户状态失败')
        );
    }
};

// 获取作者公开信息
exports.getAuthorInfo = async (req, res) => {
    try {
        console.log(chalk.blue('获取作者信息'));

        // 获取作者信息（第一个注册的用户）
        const user = await User.findOne()
            .sort({ createdAt: 1 }) // 按注册时间正序排序，获取第一个用户
            .select('username avatar intro createdAt');

        if (!user) {
            console.log(chalk.yellow('获取作者信息失败: 用户不存在'));
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '作者不存在')
            );
        }

        // 获取作者的文章统计
        const articlesCount = await Article.countDocuments({ author: user._id });

        // 获取作者的所有文章标签
        const articles = await Article.find({ author: user._id })
            .select('tags views');

        // 计算标签数量（去重）
        const uniqueTags = new Set();
        let totalViews = 0;

        articles.forEach(article => {
            article.tags.forEach(tag => uniqueTags.add(tag));
            totalViews += article.views || 0;
        });

        const authorInfo = {
            username: user.username,
            avatar: user.avatar,
            intro: user.intro || '这个人很懒，还没有写简介',
            joinTime: user.createdAt,
            stats: {
                articles: articlesCount,
                tags: uniqueTags.size,
                views: totalViews
            }
        };

        console.log(chalk.green('获取作者信息成功:', user.username));
        res.json(success(authorInfo));
    } catch (err) {
        console.error(chalk.red('获取作者信息错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取作者信息失败')
        );
    }
}; 
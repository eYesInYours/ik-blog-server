const User = require('../models/User');
const chalk = require('chalk');

// 获取用户信息
exports.getUserInfo = async (req, res) => {
    try {
        console.log(chalk.blue('获取用户信息请求, ID:', req.user.userId));

        const user = await User.findById(req.user.userId)
            .select('-password'); // 排除密码字段

        if (!user) {
            console.log(chalk.yellow('获取用户信息失败: 用户不存在'));
            return res.status(404).json({ message: '用户不存在' });
        }

        console.log(chalk.green('获取用户信息成功:', user.username));
        res.json(user);
    } catch (error) {
        console.error(chalk.red('获取用户信息错误:'), error);
        res.status(500).json({ message: '获取用户信息失败' });
    }
};

// 更新用户信息
exports.updateUserInfo = async (req, res) => {
    try {
        console.log(chalk.blue('更新用户信息请求:', req.body));
        const { username, avatar } = req.body;

        // 如果要更新用户名，检查是否已存在
        if (username) {
            const existingUser = await User.findOne({ 
                username,
                _id: { $ne: req.user.userId } // 排除当前用户
            });
            
            if (existingUser) {
                console.log(chalk.yellow('更新用户信息失败: 用户名已存在'));
                return res.status(400).json({ message: '用户名已被使用' });
            }
        }

        // 更新用户信息
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { 
                $set: {
                    ...(username && { username }),
                    ...(avatar && { avatar })
                }
            },
            { 
                new: true, // 返回更新后的文档
                select: '-password' // 排除密码字段
            }
        );

        if (!updatedUser) {
            console.log(chalk.yellow('更新用户信息失败: 用户不存在'));
            return res.status(404).json({ message: '用户不存在' });
        }

        console.log(chalk.green('更新用户信息成功:', updatedUser.username));
        res.json({
            message: '用户信息更新成功',
            user: updatedUser
        });
    } catch (error) {
        console.error(chalk.red('更新用户信息错误:'), error);
        res.status(500).json({ message: '更新用户信���失败' });
    }
};

// 修改密码
exports.changePassword = async (req, res) => {
    try {
        console.log(chalk.blue('修改密码请求'));
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            console.log(chalk.yellow('修改密码失败: 用户不存在'));
            return res.status(404).json({ message: '用户不存在' });
        }

        // 验证当前密码
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            console.log(chalk.yellow('修改密码失败: 当前密码错误'));
            return res.status(401).json({ message: '当前密码错误' });
        }

        // 更新密码
        user.password = newPassword;
        await user.save();

        console.log(chalk.green('密码修改成功'));
        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error(chalk.red('修改密码错误:'), error);
        res.status(500).json({ message: '修改密码失败' });
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

        res.json({
            users,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error(chalk.red('获取用户列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ message: '获取用户列表失败' });
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
            return res.status(CLIENT_ERROR.NOT_FOUND).json({ message: '用户不存在' });
        }

        res.json({ message: '用户状态更新成功', user });
    } catch (error) {
        console.error(chalk.red('更新用户状态错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ message: '更新用户状态失败' });
    }
}; 
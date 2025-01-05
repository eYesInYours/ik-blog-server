const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, '用户名不能为空'],
        trim: true
    },
    email: {
        type: String,
        required: [true, '邮箱不能为空'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, '密码不能为空'],
        minlength: 6
    },
    avatar: {
        type: String,
        default: ''
    },
    roles: {
        type: [String],
        default: ['reader'],  // 默认为读者角色
        enum: ['reader', 'writer']  // 限制角色类型
    }
}, {
    timestamps: true
});

// 保存前加密密码
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 比较密码
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 
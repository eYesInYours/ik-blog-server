const mongoose = require('mongoose');
const chalk = require('chalk');

const connectDB = async () => {
    try {
        console.log('正在连接数据库...');
        console.log('环境:', process.env.NODE_ENV);
        console.log('URI:', process.env.MONGODB_URI);

        await mongoose.connect(process.env.MONGODB_URI, {
            // 移除废弃的选项
            // useNewUrlParser: true,
            // useUnifiedTopology: true
        });

        console.log(chalk.green('MongoDB 连接成功'));
    } catch (err) {
        console.error(chalk.red('MongoDB 连接失败:'), err.message);
        // 如果是生产环境，连接失败就退出进程
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

// 监听连接事件
mongoose.connection.on('connected', () => {
    console.log(chalk.blue('MongoDB 已连接'));
});

mongoose.connection.on('error', (err) => {
    console.error(chalk.red('MongoDB 错误:'), err);
});

mongoose.connection.on('disconnected', () => {
    console.log(chalk.yellow('MongoDB 连接断开'));
});

// 应用终止时关闭连接
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log(chalk.yellow('MongoDB 连接已关闭'));
        process.exit(0);
    } catch (err) {
        console.error(chalk.red('关闭 MongoDB 连接时出错:'), err);
        process.exit(1);
    }
});

module.exports = connectDB; 
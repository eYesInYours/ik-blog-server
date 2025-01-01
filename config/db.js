const mongoose = require('mongoose');
const chalk = require('chalk');

const connectDB = async () => {
    try {
        // 打印连接信息
        console.log(chalk.blue('正在连接数据库...'));
        console.log(chalk.blue(`环境: ${process.env.NODE_ENV}`));
        console.log(chalk.blue(`URI: ${process.env.NODE_ENV === 'production' 
            ? process.env.MONGODB_URI_PROD 
            : process.env.MONGODB_URI_DEV}`
        ));

        // 根据环境选择数据库 URI
        const MONGODB_URI = process.env.NODE_ENV === 'production' 
            ? process.env.MONGODB_URI_PROD 
            : process.env.MONGODB_URI_DEV;

        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(chalk.green('MongoDB 连接成功'));
    } catch (error) {
        console.error(chalk.red('MongoDB 连接错误:'), error);
        process.exit(1);
    }
};

module.exports = connectDB; 
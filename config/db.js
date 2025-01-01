const mongoose = require('mongoose');
const chalk = require('chalk');

const connectDB = async () => {
    try {
        // 根据环境选择数据库 URI
        const MONGODB_URI = process.env.NODE_ENV === 'production' 
            ? process.env.MONGODB_URI_PROD 
            : process.env.MONGODB_URI_DEV;

        console.log(chalk.blue(`当前环境: ${process.env.NODE_ENV}`));
        console.log(chalk.blue(`连接数据库: ${MONGODB_URI}`));

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
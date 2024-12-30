const mongoose = require('mongoose');
const chalk = require('chalk');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
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
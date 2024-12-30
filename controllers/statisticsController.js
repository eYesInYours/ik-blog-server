const Article = require('../models/Article');
const User = require('../models/User');
const Visit = require('../models/Visit');
const Comment = require('../models/Comment');
const chalk = require('chalk');

exports.getStatistics = async (req, res) => {
    try {
        const { period = '7days' } = req.query;
        const now = new Date();
        let daysCount;

        // 根据查询周期确定天数
        switch(period) {
            case '24hours':
                daysCount = 1;
                break;
            case '7days':
                daysCount = 7;
                break;
            case '30days':
                daysCount = 30;
                break;
            default:
                daysCount = 7;
        }

        // 设置时区为中国时区
        const timezone = 'Asia/Shanghai';
        
        // 计算开始日期（使用当地时间）
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysCount + 1);
        startDate.setHours(0, 0, 0, 0);

        // 计算结束日期（使用当地时间）
        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        // 生成日期范围
        const days = [];
        for (let i = 0; i < daysCount; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            days.push({
                date: date.toISOString().split('T')[0],
                visits: 0,
                articles: 0,
                users: 0,
                comments: 0
            });
        }

        // 获取文章统计
        const articlesStats = await Article.aggregate([
            {
                $match: {
                    createdAt: { 
                        $gte: startDate, 
                        $lte: endDate 
                    },
                    status: 'active'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                            timezone
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 获取用户统计
        const usersStats = await User.aggregate([
            {
                $match: {
                    createdAt: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                            timezone
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 获取访问统计
        const visitsStats = await Visit.aggregate([
            {
                $match: {
                    timestamp: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$timestamp",
                            timezone
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 获取评论统计
        const commentsStats = await Comment.aggregate([
            {
                $match: {
                    createdAt: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                            timezone
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 将统计数据填充到日期数组中
        days.forEach(day => {
            const articleStat = articlesStats.find(stat => stat._id === day.date);
            const userStat = usersStats.find(stat => stat._id === day.date);
            const visitStat = visitsStats.find(stat => stat._id === day.date);
            const commentStat = commentsStats.find(stat => stat._id === day.date);

            day.articles = articleStat ? articleStat.count : 0;
            day.users = userStat ? userStat.count : 0;
            day.visits = visitStat ? visitStat.count : 0;
            day.comments = commentStat ? commentStat.count : 0;
        });

        // 获取总计数据（使用相同的时间范围）
        const totals = {
            articles: await Article.countDocuments({ 
                createdAt: { $gte: startDate, $lte: endDate },
                status: 'active' 
            }),
            users: await User.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            }),
            comments: await Comment.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            }),
            visits: await Visit.countDocuments({
                timestamp: { $gte: startDate, $lte: endDate }
            })
        };

        const response = {
            dates: days.map(day => day.date),
            articles: days.map(day => day.articles),
            users: days.map(day => day.users),
            visits: days.map(day => day.visits),
            comments: days.map(day => day.comments),
            totals
        };

        console.log(chalk.green(`成功获取 ${period} 的统计数据`));
        res.json(response);

    } catch (error) {
        console.error(chalk.red('获取统计数据错误:'), error);
        res.status(500).json({ message: '获取统计数据失败' });
    }
}; 
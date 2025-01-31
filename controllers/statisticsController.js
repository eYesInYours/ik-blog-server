const Article = require('../models/Article');
const User = require('../models/User');
const Visit = require('../models/Visit');
const Comment = require('../models/Comment');
const chalk = require('chalk');
const { success } = require('../utils/responseHandler');

exports.getStatistics = async (req, res) => {
    try {
        const { startDate, endDate, type = 'day' } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: '缺少必要的日期参数' });
        }

        // 设置查询的起止时间
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // 设置时区为中国时区
        const timezone = 'Asia/Shanghai';

        // 根据查询类型设置日期格式
        let dateFormat;
        switch (type) {
            case 'year':
                dateFormat = '%Y';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }

        // 生成日期范围数组
        const generateDateRange = () => {
            const dates = [];
            let current = new Date(start);
            
            while (current <= end) {
                let dateKey;
                if (type === 'year') {
                    dateKey = current.getFullYear().toString();
                } else if (type === 'month') {
                    dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                } else {
                    dateKey = current.toISOString().split('T')[0];
                }
                
                dates.push({
                    date: dateKey,
                    visits: 0,
                    articles: 0,
                    users: 0,
                    comments: 0
                });

                // 增加时间间隔
                if (type === 'year') {
                    current.setFullYear(current.getFullYear() + 1);
                } else if (type === 'month') {
                    current.setMonth(current.getMonth() + 1);
                } else {
                    current.setDate(current.getDate() + 1);
                }
            }
            return dates;
        };

        const days = generateDateRange();

        // 查询条件
        const dateRange = { 
            $gte: start, 
            $lte: end 
        };

        // 获取文章统计
        const articlesStats = await Article.aggregate([
            {
                $match: {
                    createdAt: dateRange,
                    status: 'published'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: dateFormat,
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
                    createdAt: dateRange
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: dateFormat,
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
                    timestamp: dateRange
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: dateFormat,
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
                    createdAt: dateRange
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: dateFormat,
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

        const response = {
            dates: days.map(day => day.date),
            articles: days.map(day => day.articles),
            users: days.map(day => day.users),
            visits: days.map(day => day.visits),
            comments: days.map(day => day.comments),
            totals: {
                articles: days.reduce((sum, day) => sum + day.articles, 0),
                users: days.reduce((sum, day) => sum + day.users, 0),
                visits: days.reduce((sum, day) => sum + day.visits, 0),
                comments: days.reduce((sum, day) => sum + day.comments, 0)
            }
        };

        console.log(chalk.green(`成功获取 ${startDate} 到 ${endDate} 的${type}统计数据`));
        res.json(success(response, '获取统计数据成功'));

    } catch (error) {
        console.error(chalk.red('获取统计数据错误:'), error);
        res.status(500).json({ message: '获取统计数据失败' });
    }
}; 
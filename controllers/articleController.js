const Article = require('../models/Article');
const User = require('../models/User');
const chalk = require('chalk');
const Comment = require('../models/Comment');

// 创建文章
exports.createArticle = async (req, res) => {
    try {
        console.log(chalk.blue('创建文章请求数据:'), req.body);
        const { title, content, tags, cover } = req.body;

        // 获取作者信息包括头像
        const author = await User.findById(req.user.userId);

        const article = new Article({
            title,
            content,
            tags,
            cover,
            status: 'active',
            author: req.user.userId,
            authorAvatar: author.avatar
        });

        await article.save();
        console.log(chalk.green('文章创建成功:', article.title));
        res.status(201).json({
            message: '文章创建成功',
            article
        });
    } catch (error) {
        console.error(chalk.red('创建文章错误:'), error);
        res.status(500).json({ message: '创建文章失败' });
    }
};

// 获取所有文章
exports.getArticles = async (req, res) => {
    try {
        console.log(chalk.blue('获取文章列表请求:', req.query));
        const { page = 1, limit = 10 } = req.query;
        const articles = await Article.find({
            status: 'active'
        })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Article.countDocuments();

        console.log(chalk.green('获取文章列表成功, 总数:', total));
        res.json({
            articles,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error(chalk.red('获取文章列表错误:'), error);
        res.status(500).json({ message: '获取文章列表失败' });
    }
};

// 获取单个文章
exports.getArticle = async (req, res) => {
    try {
        console.log(chalk.blue('获取文章请求, ID:', req.params.id));

        // 验证文章ID格式
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            console.log(chalk.yellow('获取文章失败: 无效的文章ID格式'));
            return res.status(400).json({ message: '无效的文章ID格式' });
        }

        // 获取文章基本信息
        const article = await Article.findById(req.params.id)
            .populate('author', 'username avatar');
        
        if (!article) {
            console.log(chalk.yellow('获取文章失败: 文章不存在'));
            return res.status(404).json({ message: '文章不存在' });
        }
        
        // 获取文章的所有评论
        const comments = await Comment.find({ article: req.params.id })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: 1 });

        // 构建评论树
        const commentMap = new Map();
        const rootComments = [];

        // 第一次遍历：创建所有评论的映射
        comments.forEach(comment => {
            commentMap.set(comment._id.toString(), {
                ...comment.toObject(),
                replies: []
            });
        });

        // 第二次遍历：构建评论树
        comments.forEach(comment => {
            const commentData = commentMap.get(comment._id.toString());
            if (comment.parentComment) {
                // 这是一个回复
                const parentComment = commentMap.get(comment.parentComment._id.toString());
                if (parentComment) {
                    // 添加到父评论的回复列表中
                    parentComment.replies.push({
                        ...commentData,
                        replyTo: {
                            _id: comment.parentComment._id,
                            author: comment.parentComment.author,
                            content: comment.parentComment.content
                        }
                    });
                }
            } else {
                // 这是一个根评论
                rootComments.push(commentData);
            }
        });

        // 将评论树添加到文章数据中
        const articleData = article.toObject();
        articleData.comments = rootComments;

        console.log(chalk.green('获取文章成功:', article.title));
        res.json(articleData);
    } catch (error) {
        console.error(chalk.red('获取文章错误:'), error);
        res.status(500).json({ message: '获取文章失败' });
    }
};

// 更新文章
exports.updateArticle = async (req, res) => {
    try {
        const { title, content, tags, cover } = req.body;
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: '文章不存在' });
        }

        // 确保只有作者可以更新文章
        if (article.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: '没有权限修改此文章' });
        }

        article.title = title || article.title;
        article.content = content || article.content;
        article.tags = tags || article.tags;
        article.cover = cover || article.cover;
        article.updatedAt = Date.now();

        await article.save();
        res.json({
            message: '文章更新成功',
            article
        });
    } catch (error) {
        console.error(chalk.red('更新文章错误:'), error);
        res.status(500).json({ message: '更新文章失败' });
    }
};

// 删除文章
exports.deleteArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: '文章不存在' });
        }

        // 确保只有作者可以删除文章
        if (article.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: '没有权限删除此文章' });
        }

        await article.deleteOne();
        res.json({ message: '文章删除成功' });
    } catch (error) {
        console.error('删除文章错误:', error);
        res.status(500).json({ message: '删除文章失败' });
    }
};

// 获取所有文章（管理接口）
exports.getAllArticlesAdmin = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            keyword = '', 
            status,
            startDate,
            endDate,
            tags,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        // 构建查询条件
        const query = {};

        // 关键字搜索
        if (keyword) {
            query.$or = [
                { title: new RegExp(keyword, 'i') },
                { content: new RegExp(keyword, 'i') }
            ];
        }

        // 状态筛选
        if (status && ['active', 'disabled'].includes(status)) {
            query.status = status;
        }

        // 日期范围筛选
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        // 标签筛选
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',');
            query.tags = { $in: tagArray };
        }

        // 验证排序字段
        const allowedSortFields = ['createdAt', 'updatedAt', 'title'];
        const actualSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

        // 构建排序对象
        const sort = {
            [actualSortBy]: sortOrder === 'asc' ? 1 : -1
        };

        const articles = await Article.find(query)
            .populate('author', 'username avatar')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Article.countDocuments(query);

        res.json({
            articles,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error(chalk.red('获取文章列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ message: '获取文章列表失败' });
    }
};

// 更新文章状态（管理接口）
exports.updateArticleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'disabled'].includes(status)) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({ 
                message: '无效的状态值' 
            });
        }

        const article = await Article.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate('author', 'username avatar');

        if (!article) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({ 
                message: '文章不存在' 
            });
        }

        res.json({
            message: '文章状态更新成功',
            article
        });
    } catch (error) {
        console.error(chalk.red('更新文章状态错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '更新文章状态失败' 
        });
    }
};

// 批量删除文章（管理接口）
exports.batchDeleteArticles = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({ 
                message: '无效的文章ID列表' 
            });
        }

        const result = await Article.deleteMany({ _id: { $in: ids } });

        res.json({
            message: '文章批量删除成功',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(chalk.red('批量删除文章错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ 
            message: '批量删除文章失败' 
        });
    }
}; 
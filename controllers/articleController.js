const Article = require('../models/Article');
const User = require('../models/User');
const chalk = require('chalk');
const Comment = require('../models/Comment');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');

// 创建文章
exports.createArticle = async (req, res) => {
    try {
        console.log(chalk.blue('创建文章请求数据:'), req.body);
        console.log(chalk.blue('当前用户信息:'), req.user);

        const { title, content, tags, category, categoryName, status, allowComment, cover, summary } = req.body;

        // 获取作者信息包括头像
        const author = await User.findById(req.user._id);
        console.log(chalk.blue('查询到的作者信息:'), author);

        if (!author) {
            console.log(chalk.red('作者信息不存在'));
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '作者信息不存在')
            );
        }

        const article = new Article({
            title,
            content,
            tags,
            category,
            categoryName,
            status: status || 'published',
            allowComment: allowComment ?? true,
            cover,
            summary,
            author: req.user._id,
            authorAvatar: author.avatar || ''
        });

        await article.save();
        console.log(chalk.green('文章创建成功:', article.title));

        res.status(201).json(
            success(article, '文章创建成功')
        );
    } catch (err) {
        console.error(chalk.red('创建文章错误:'), err);
        console.error(chalk.red('错误堆栈:'), err.stack);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '创建文章失败')
        );
    }
};

// 获取所有文章
exports.getArticles = async (req, res) => {
    try {
        console.log(chalk.blue('获取文章列表请求:', req.query));
        const { page = 1, limit = 10 } = req.query;

        const articles = await Article.find({ status: 'published' })
            .populate('author', 'username avatar')
            .populate('category', 'name')
            .populate({
                path: 'comments',
                populate: [
                    {
                        path: 'author',
                        select: 'username avatar'
                    },
                    {
                        path: 'parentComment',
                        populate: {
                            path: 'author',
                            select: 'username avatar'
                        }
                    }
                ],
                options: { sort: { createdAt: -1 } }
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Article.countDocuments({ status: 'published' });

        // 处理评论数据结构
        const articlesWithFormattedComments = articles.map(article => {
            const articleObj = article.toObject();
            
            // 区分主评论和回复
            const mainComments = articleObj.comments.filter(comment => !comment.parentComment);
            const replies = articleObj.comments.filter(comment => comment.parentComment);
            
            // 构建评论树
            articleObj.comments = mainComments.map(mainComment => ({
                ...mainComment,
                replies: replies
                    .filter(reply => reply.parentComment._id.toString() === mainComment._id.toString())
                    .map(reply => ({
                        ...reply,
                        replyTo: reply.parentComment
                    }))
            }));
            
            return articleObj;
        });

        console.log(chalk.green('获取文章列表成功, 总数:', total));
        res.json(success({
            articles: articlesWithFormattedComments.map(article => ({
                ...article,
                likes: article.likes.length
            })),
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        }));
    } catch (err) {
        console.error(chalk.red('获取文章列表错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取文章列表失败')
        );
    }
};

// 获取单个文章
exports.getArticle = async (req, res) => {
    try {
        console.log(chalk.blue('获取文章请求, ID:', req.params.id));

        // 验证文章ID格式
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            console.log(chalk.yellow('获取文章失败: 无效的文章ID格式'));
            return res.status(400).json(
                error(CLIENT_ERROR.BAD_REQUEST, '无效的文章ID格式')
            );
        }

        // 获取文章基本信息
        const article = await Article.findById(req.params.id)
            .populate('author', 'username avatar');

        if (!article) {
            console.log(chalk.yellow('获取文章失败: 文章不存在'));
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '文章不存在')
            );
        }

        // 获取文章的所有评论（使用新的评论模型结构）
        const comments = await Comment.find({ 
            target: req.params.id,
            targetType: 'Article'
        })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: 1 });

        // 构建评论树
        const mainComments = comments.filter(comment => !comment.parentComment);
        const replies = comments.filter(comment => comment.parentComment);
        
        const formattedComments = mainComments.map(mainComment => {
            const commentObj = mainComment.toObject();
            commentObj.replies = replies
                .filter(reply => 
                    reply.parentComment._id.toString() === mainComment._id.toString()
                )
                .map(reply => ({
                    ...reply.toObject(),
                    replyTo: reply.parentComment
                }));
            return commentObj;
        });

        // 将评论树添加到文章数据中
        const articleData = article.toObject();
        articleData.comments = formattedComments;
        articleData.likes = article.likes.length;

        console.log(chalk.green('获取文章成功:', article.title));
        res.json(success(articleData));
    } catch (err) {
        console.error(chalk.red('获取文章错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取文章失败')
        );
    }
};

// 更新文章
exports.updateArticle = async (req, res) => {
    try {
        const { title, content, tags, cover, categoryName, category } = req.body;
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: '文章不存在' });
        }

        article.title = title || article.title;
        article.content = content || article.content;
        article.tags = tags || article.tags;
        article.cover = cover || article.cover;
        article.categoryName = categoryName || article.categoryName;
        article.category = category || article.category;
        article.updatedAt = Date.now();

        await article.save();
        res.json({
            code: SUCCESS.OK,
            data: article,
            message: '文章更新成功'
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

        await article.deleteOne();
        res.json({ 
            code: SUCCESS.OK,
            data: null, 
            message: '文章删除成功'
         });
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
            code: SUCCESS.OK,
            message: '获取文章列表成功',
            data: {
                articles,
                pagination: {
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    limit: parseInt(limit)
                }
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
            code: SUCCESS.OK,
            data: null,
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

// 点赞/取消点赞文章
exports.toggleLike = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        
        if (!article) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                message: '文章不存在'
            });
        }
        
        const index = article.likes.indexOf(req.user._id);
        if (index === -1) {
            article.likes.push(req.user._id);
        } else {
            article.likes.splice(index, 1);
        }
        
        await article.save();
        
        res.json({
            code: SUCCESS.OK,
            message: index === -1 ? '点赞成功' : '取消点赞成功',
            data: {
                likes: article.likes.length
            }
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            message: '操作失败'
        });
    }
};

// 获取文章归档列表
exports.getArticleArchives = async (req, res) => {
    try {
        const { type = 'date' } = req.query; // date, tag, category

        console.log(chalk.blue('获取文章归档请求参数:', type));
        
        // 获取所有已发布的文章
        const articles = await Article.find({ status: 'published' })
            .select('title createdAt tags category likes comments')
            .sort({ createdAt: -1 });
        
        let archiveData = {};
        
        switch (type) {
            case 'date':
                // 按年月分组
                articles.forEach(article => {
                    const date = new Date(article.createdAt);
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    
                    if (!archiveData[year]) {
                        archiveData[year] = {};
                    }
                    if (!archiveData[year][month]) {
                        archiveData[year][month] = [];
                    }
                    
                    archiveData[year][month].push({
                        _id: article._id,
                        title: article.title,
                        createdAt: article.createdAt,
                        likes: article.likes.length,
                        comments: article.comments.length
                    });
                });
                
                // 转换为前端需要的格式
                archiveData = Object.entries(archiveData)
                    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
                    .map(([year, months]) => ({
                        year: Number(year),
                        count: Object.values(months).flat().length,
                        months: Object.entries(months).map(([month, articles]) => ({
                            month: Number(month),
                            articles,
                            count: articles.length
                        }))
                    }));
                break;
                
            case 'tag':
                // 按标签分组
                const tagMap = new Map();
                articles.forEach(article => {
                    article.tags.forEach(tag => {
                        if (!tagMap.has(tag)) {
                            tagMap.set(tag, []);
                        }
                        tagMap.get(tag).push({
                            _id: article._id,
                            title: article.title,
                            createdAt: article.createdAt,
                            likes: article.likes.length,
                            comments: article.comments.length
                        });
                    });
                });
                
                archiveData = Array.from(tagMap.entries())
                    .map(([tag, articles]) => ({
                        tag,
                        articles,
                        count: articles.length
                    }))
                    .sort((a, b) => b.count - a.count);
                break;
                
            case 'category':
                // 按分类分组
                const categoryMap = new Map();
                articles.forEach(article => {
                    if (!categoryMap.has(article.category)) {
                        categoryMap.set(article.category, []);
                    }
                    // 查询category的name
                    categoryMap.get(article.category).push({
                        _id: article._id,
                        title: article.title,
                        createdAt: article.createdAt,
                        likes: article.likes.length,
                        comments: article.comments.length
                    });
                });
                
                archiveData = Array.from(categoryMap.entries())
                    .map(([category, articles]) => ({
                        category,
                        articles,
                        count: articles.length
                    }))
                    .sort((a, b) => b.count - a.count);
                break;
        }
        
        res.json(success({
            type,
            archives: archiveData,
            total: articles.length
        }));
    } catch (err) {
        console.error(chalk.red('获取文章归档错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取文章归档失败')
        );
    }
}; 
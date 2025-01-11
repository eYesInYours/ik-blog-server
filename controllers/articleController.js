const Article = require('../models/Article');
const User = require('../models/User');
const chalk = require('chalk');
const Comment = require('../models/Comment');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');
const Category = require('../models/Category');
const { createArticleLikeNotification } = require('./notificationController');

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
        const token = req.headers.authorization?.split(' ')[1];
        let currentUserId = null;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                currentUserId = decoded.userId;
                console.log(chalk.blue('当前用户:', currentUserId));
            } catch (err) {
                console.log(chalk.yellow('Token 验证失败:', err.message));
            }
        }

        // 验证文章ID格式
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            console.log(chalk.yellow('获取文章失败: 无效的文章ID格式'));
            return res.status(400).json(
                error(CLIENT_ERROR.BAD_REQUEST, '无效的文章ID格式')
            );
        }

        // 获取文章基本信息
        const article = await Article.findById(req.params.id)
            .populate('author', 'username avatar')
            .lean();

        if (!article) {
            console.log(chalk.yellow('获取文章失败: 文章不存在'));
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '文章不存在')
            );
        }

        // 获取文章的所有评论
        const comments = await Comment.find({ 
            target: req.params.id,
            targetType: 'Article',
            parentComment: null  // 只获取主评论
        })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .lean();

        // 获取所有回复
        const replies = await Comment.find({
            target: req.params.id,
            targetType: 'Article',
            parentComment: { $ne: null }
        })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: 1 })
            .lean();

        // 处理评论的点赞信息
        const processComments = (comments) => {
            return comments.map(comment => {
                // 处理点赞信息
                const likesCount = comment.likes?.length || 0;
                const isLiked = currentUserId ? comment.likes?.some(id => 
                    id.toString() === currentUserId
                ) : false;

                // 删除原始点赞数组，只保留计数和状态
                const { likes: _, ...rest } = comment;
                return {
                    ...rest,
                    likes: likesCount,
                    isLiked
                };
            });
        };

        // 处理主评论和回复
        const processedComments = processComments(comments);
        const processedReplies = processComments(replies);

        // 构建评论树
        const commentTree = processedComments.map(comment => {
            const commentReplies = processedReplies.filter(reply => 
                reply.parentComment._id.toString() === comment._id.toString()
            );
            
            return {
                ...comment,
                replies: commentReplies.map(reply => ({
                    ...reply,
                    replyTo: reply.parentComment
                }))
            };
        });

        // 处理文章的点赞和收藏状态
        const articleData = {
            ...article,
            comments: commentTree,
            isLiked: currentUserId ? article.likes?.some(id => id.toString() === currentUserId) : false,
            isCollected: currentUserId ? article.collections?.some(id => id.toString() === currentUserId) : false,
            likesCount: article.likes?.length || 0,
            collectionsCount: article.collections?.length || 0,
            likes: article.likes?.length || 0,
            collections: article.collections?.length || 0
        };

        // 删除不需要的数组
        delete articleData.likes;
        delete articleData.collections;

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
        // 获取完整的文章信息，包括作者
        const article = await Article.findById(req.params.id)
            .populate('author', '_id'); // 只需要作者ID

        if (!article) {
            return res.status(404).json(error(CLIENT_ERROR.NOT_FOUND, '文章不存在'));
        }

        const index = article.likes.indexOf(req.user._id);
        if (index === -1) {
            // 添加点赞
            article.likes.push(req.user._id);
            
            // 只有在点赞时且不是自己的文章时才创建通知
            if (article.author._id.toString() !== req.user._id.toString()) {
                try {
                    const notification = await createArticleLikeNotification(req.user, article);
                    console.log('Article like notification created:', notification);
                } catch (notificationError) {
                    console.error('Failed to create article like notification:', notificationError);
                }
            }
        } else {
            // 取消点赞
            article.likes.splice(index, 1);
        }

        await article.save();

        res.json(success({
            likes: article.likes.length,
            isLiked: index === -1
        }, index === -1 ? '点赞成功' : '取消点赞成功'));
    } catch (err) {
        console.error('Error in toggleLike:', err);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '操作失败'));
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
                const categoryMap = new Map()
                
                // 先获取所有文章的分类ID
                const categoryIds = [...new Set(articles.map(article => article.category))]
                
                // 查询所有相关的分类信息
                const categories = await Category.find({
                    _id: { $in: categoryIds }
                }).select('name')

                // 创建分类ID到分类名称的映射
                const categoryNameMap = new Map(
                    categories.map(cat => [cat._id.toString(), cat.name])
                )

                // 按分类分组文章
                articles.forEach(article => {
                    const categoryId = article.category.toString()
                    if (!categoryMap.has(categoryId)) {
                        categoryMap.set(categoryId, [])
                    }
                    categoryMap.get(categoryId).push({
                        _id: article._id,
                        title: article.title,
                        createdAt: article.createdAt,
                        likes: article.likes.length,
                        comments: article.comments.length
                    })
                })

                // 构建归档数据
                archiveData = Array.from(categoryMap.entries())
                    .map(([categoryId, articles]) => ({
                        category: categoryId,
                        categoryName: categoryNameMap.get(categoryId) || '未分类', // 使用查询到的分类名称
                        articles,
                        count: articles.length
                    }))
                    .sort((a, b) => b.count - a.count)
                break
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

// 收藏/取消收藏文章
exports.toggleCollect = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        
        if (!article) {
            return res.status(404).json(
                error(CLIENT_ERROR.NOT_FOUND, '文章不存在')
            );
        }
        
        // 检查用户是否已收藏
        const index = article.collections.indexOf(req.user._id);
        const newIsCollected = index === -1; // 如果之前没有收藏，现在就是已收藏状态
        
        if (newIsCollected) {
            // 添加收藏
            article.collections.push(req.user._id);
            console.log(chalk.green(`用户 ${req.user.username} 收藏了文章 ${article.title}`));
        } else {
            // 取消收藏
            article.collections.splice(index, 1);
            console.log(chalk.yellow(`用户 ${req.user.username} 取消收藏了文章 ${article.title}`));
        }
        
        await article.save();
        
        res.json(success({
            collections: article.collections.length,
            isCollected: newIsCollected  // 返回新的收藏状态
        }, newIsCollected ? '收藏成功' : '取消收藏成功'));
    } catch (err) {
        console.error(chalk.red('收藏文章错误:'), err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '操作失败')
        );
    }
};

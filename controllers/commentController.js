const Comment = require('../models/Comment');
const Article = require('../models/Article');
const User = require('../models/User');
const chalk = require('chalk');

// 创建评论
exports.createComment = async (req, res) => {
    try {
        console.log(chalk.blue('创建评论请求数据:'), req.body);
        const { content, articleId, parentCommentId } = req.body;
        const author = await User.findById(req.user.userId);

        let rootCommentId = null;
        // 如果是回复评论，验证父评论是否存在
        if (parentCommentId) {
            const parentComment = await Comment.findById(parentCommentId);
            if (!parentComment) {
                console.log(chalk.yellow('创建评论失败: 父评论不存在'));
                return res.status(404).json({ message: '要回复的评论不存在' });
            }
            // 确保父评论属于同一篇文章
            if (parentComment.article.toString() !== articleId) {
                console.log(chalk.yellow('创建评论失败: 父评论不属于该文章'));
                return res.status(400).json({ message: '评论关联错误' });
            }
            // 如果父评论已经是回复，则使用其父评论作为新评论的父评论
            if (parentComment.parentComment) {
                const rootComment = await Comment.findById(parentComment.parentComment);
                if (rootComment) {
                    console.log(chalk.blue('回复评论的回复，关联到原始评论'));
                    rootCommentId = rootComment._id;
                    // 保持原始的 parentCommentId，用于显示"回复谁"
                }
            } else {
                rootCommentId = parentComment._id;
            }
        }

        const comment = new Comment({
            content,
            article: articleId,
            author: req.user.userId,
            authorAvatar: author.avatar,
            parentComment: rootCommentId || parentCommentId || null
        });

        await comment.save();

        // 更新文章的评论数组
        await Article.findByIdAndUpdate(
            articleId,
            { $push: { comments: comment._id } }
        );

        // 获取完整的评论结构
        const fullComment = await Comment.findById(comment._id)
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: {
                    path: 'author',
                    select: 'username avatar'
                }
            });

        // 如果是回复，则获取完整的评论树结构
        let responseData;
        if (rootCommentId || parentCommentId) {
            // 获取根评论及其所有回复
            const rootComment = await Comment.findById(rootCommentId || parentCommentId)
                .populate('author', 'username avatar')
                .populate({
                    path: 'parentComment',
                    populate: { path: 'author', select: 'username avatar' }
                });

            const replies = await Comment.find({
                article: articleId,
                parentComment: rootComment._id
            })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: 1 });

            responseData = {
                ...rootComment.toObject(),
                replies: replies.map(reply => ({
                    ...reply.toObject(),
                    replyTo: reply.parentComment._id.toString() === rootComment._id.toString() 
                        ? rootComment 
                        : reply.parentComment
                }))
            };
        } else {
            // 如果是主评论，直接返回新创建的评论
            responseData = {
                ...fullComment.toObject(),
                replies: []
            };
        }

        console.log(chalk.green('评论创建成功:', comment._id));
        console.log(chalk.blue('返回的评论数据:', JSON.stringify(responseData, null, 2)));
        res.status(201).json({
            message: '评论创建成功',
            comment: responseData
        });
    } catch (error) {
        console.error(chalk.red('创建评论错误:'), error);
        res.status(500).json({ message: '创建评论失败' });
    }
};

// 获取文章的所有评论
exports.getArticleComments = async (req, res) => {
    try {
        const { articleId } = req.params;
        console.log(chalk.blue('获取文章评论请求, 文章ID:', articleId));

        // 先获取所有主评论
        const mainComments = await Comment.find({ 
            article: articleId,
            parentComment: null  // 只获取主评论
        })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 });

        // 获取所有回复
        const replies = await Comment.find({
            article: articleId,
            parentComment: { $ne: null }  // 获取所有回复
        })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: -1 });

        // 构建评论树
        const commentTree = mainComments.map(comment => {
            const commentData = comment.toObject();
            // 找出所有属于这个主评论的回复
            const commentReplies = replies.filter(reply => 
                findRootParentId(reply, [...mainComments, ...replies]) === comment._id.toString()
            );
            
            return {
                ...commentData,
                replies: commentReplies.map(reply => ({
                    ...reply.toObject(),
                    replyTo: reply.parentComment
                }))
            };
        });

        console.log(chalk.green('获取评论列表成功, 总数:', mainComments.length + replies.length));
        res.json(commentTree);
    } catch (error) {
        console.error(chalk.red('获取评论列表错误:'), error);
        res.status(500).json({ message: '获取评论列表失败' });
    }
};

// 辅助函数：找到评论的根评论ID
function findRootParentId(comment, allComments) {
    let currentComment = comment;
    let depth = 0;
    const maxDepth = 10; // 防止循环引用

    while (currentComment.parentComment && depth < maxDepth) {
        const parentComment = allComments.find(c => 
            c._id.toString() === currentComment.parentComment._id.toString()
        );
        
        if (!parentComment.parentComment) {
            // 找到了根评论
            return parentComment._id.toString();
        }
        
        currentComment = parentComment;
        depth++;
    }
    
    return null;
}

// 更新评论
exports.updateComment = async (req, res) => {
    try {
        const { content } = req.body;
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            console.log(chalk.yellow('更新评论失败: 评论不存在'));
            return res.status(404).json({ message: '评论不存在' });
        }

        // 确保只有评论作者可以更新评论
        if (comment.author.toString() !== req.user.userId) {
            console.log(chalk.yellow('更新评论失败: 没有权限'));
            return res.status(403).json({ message: '没有权限修改此评论' });
        }

        comment.content = content;
        await comment.save();

        // 获取更新后的完整评论结构
        const updatedComment = await Comment.findById(comment._id)
            .populate('author', 'username avatar')
            .populate('parentComment');

        // 如果是回复，则获取根评论的完整结构
        let responseData;
        if (comment.parentComment) {
            const rootComment = await Comment.findById(comment.parentComment)
                .populate('author', 'username avatar');

            const replies = await Comment.find({
                article: comment.article,
                parentComment: rootComment._id
            })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: 1 });

            responseData = {
                ...rootComment.toObject(),
                replies: replies.map(reply => ({
                    ...reply.toObject(),
                    replyTo: reply.parentComment
                }))
            };
        } else {
            // 如果是主评论，获取其所有回复
            const replies = await Comment.find({
                article: comment.article,
                parentComment: comment._id
            })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: 1 });

            responseData = {
                ...updatedComment.toObject(),
                replies: replies.map(reply => ({
                    ...reply.toObject(),
                    replyTo: reply.parentComment
                }))
            };
        }

        console.log(chalk.green('评论更新成功:', comment._id));
        res.json({
            message: '评论更新成功',
            comment: responseData
        });
    } catch (error) {
        console.error(chalk.red('更新评论错误:'), error);
        res.status(500).json({ message: '更新评论失败' });
    }
};

// 删除评论
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: '评论不存在' });
        }

        // 确保只有评论作者可以删除评论
        if (comment.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: '没有权限删除此评论' });
        }

        // 从文章的评论数组中移除
        await Article.findByIdAndUpdate(
            comment.article,
            { $pull: { comments: comment._id } }
        );

        await comment.deleteOne();
        res.json({ message: '评论删除成功' });
    } catch (error) {
        console.error(chalk.red('删除评论错误:'), error);
        res.status(500).json({ message: '删除评论失败' });
    }
};

// 获取所有评论（管理接口）
exports.getAllComments = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '' } = req.query;

        // 构建查询条件
        const query = keyword ? {
            content: new RegExp(keyword, 'i')
        } : {};

        const comments = await Comment.find(query)
            .populate('author', 'username avatar')
            .populate('article', 'title')
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Comment.countDocuments(query);

        res.json({
            comments,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error(chalk.red('获取评论列表错误:'), error);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({ message: '获取评论列表失败' });
    }
}; 
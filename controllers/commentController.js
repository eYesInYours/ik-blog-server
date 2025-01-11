const Comment = require('../models/Comment');
const Article = require('../models/Article');
const Diary = require('../models/Diary');
const User = require('../models/User');
const chalk = require('chalk');
const { SUCCESS, CLIENT_ERROR } = require('../constants/httpStatus');
const { 
    createCommentNotification, 
    createReplyNotification, 
    createCommentLikeNotification 
} = require('./notificationController');

// 创建评论
exports.createComment = async (req, res) => {
    try {
        console.log(chalk.blue('创建评论请求数据:'), req.body);
        const { content, articleId, diaryId, parentCommentId } = req.body;
        const author = await User.findById(req.user._id);

        // 验证评论目标存在
        let targetModel, target;
        if (articleId) {
            targetModel = Article;
            target = await Article.findById(articleId);
        } else if (diaryId) {
            targetModel = Diary;
            target = await Diary.findById(diaryId);
        }

        if (!target) {
            return res.status(404).json({ message: '评论目标不存在' });
        }

        let rootCommentId = null;
        // 如果是回复评论，验证父评论是否存在
        if (parentCommentId) {
            const parentComment = await Comment.findById(parentCommentId);
            if (!parentComment) {
                console.log(chalk.yellow('创建评论失败: 父评论不存在'));
                return res.status(404).json({ message: '要回复的评论不存在' });
            }
            // 确保父评论属于同一目标
            const targetId = articleId || diaryId;
            if (parentComment.target.toString() !== targetId) {
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
            target: articleId || diaryId,
            targetType: articleId ? 'Article' : 'Diary',
            author: req.user._id,
            authorAvatar: author.avatar,
            parentComment: rootCommentId || parentCommentId || null
        });

        await comment.save();

        // 更新目标的评论数组
        await targetModel.findByIdAndUpdate(
            articleId || diaryId,
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
                target: articleId || diaryId,
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

        // 创建评论后，发送通知
        // 如果是回复评论
        if (parentCommentId) {
            const parentComment = await Comment.findById(parentCommentId)
                .populate('author', 'username');
            
            // 给被回复的评论作者发送通知
            await createReplyNotification(comment, parentComment);
        } else {
            // 如果是对文章的直接评论，通知文章作者
            const article = await Article.findById(articleId)
                .populate('author', 'username');
            
            if (article.author._id.toString() !== req.user._id.toString()) {
                await createCommentNotification(comment, article);
            }
        }

        res.status(201).json({
            message: '评论创建成功',
            comment: responseData
        });
    } catch (error) {
        console.error('创建评论错误:', error);
        res.status(500).json({ message: '创建评论失败' });
    }
};

// 获取评论列表（支持文章和日记）
exports.getComments = async (req, res) => {
    try {
        console.log(chalk.blue('获取评论列表请求参数:', req.params));
        const { articleId, diaryId } = req.params;
        const targetId = articleId || diaryId;
        const targetType = articleId ? 'Article' : 'Diary';
        const userId = req.user?._id;

        // 先获取所有主评论
        const mainComments = await Comment.find({ 
            target: targetId,
            targetType,
            parentComment: null  // 只获取主评论
        })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .lean();

        // 获取所有回复
        const replies = await Comment.find({
            target: targetId,
            targetType,
            parentComment: { $ne: null }  // 获取所有回复
        })
            .populate('author', 'username avatar')
            .populate({
                path: 'parentComment',
                select: 'author content',  // 只获取必要的字段
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: 1 })
            .lean();

        // 处理评论的点赞信息
        const processComment = (comment) => {
            const likesCount = comment.likes?.length || 0;
            const isLiked = userId ? comment.likes?.some(id => id.toString() === userId.toString()) : false;

            // 删除不需要的字段
            const { likes, __v, updatedAt, authorAvatar, ...rest } = comment;

            return {
                ...rest,
                likes: likesCount,
                isLiked
            };
        };

        // 处理主评论和回复
        const processedMainComments = mainComments.map(comment => {
            const commentReplies = replies.filter(reply => 
                reply.parentComment._id.toString() === comment._id.toString()
            );

            return {
                ...processComment(comment),
                replies: commentReplies.map(reply => {
                    const processedReply = processComment(reply);
                    // 简化 replyTo 对象，只保留必要信息
                    const { author, content, _id } = reply.parentComment;
                    processedReply.replyTo = { author, content, _id };
                    return processedReply;
                })
            };
        });

        console.log(chalk.green('获取评论列表成功, 总数:', mainComments.length));

        res.json({
            code: SUCCESS.OK,
            data: processedMainComments,
            message: '获取评论列表成功'
        });
    } catch (error) {
        console.error(chalk.red('获取评论列表错误:', error));
        res.status(500).json({ message: '获取评论失败' });
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
        if (comment.author.toString() !== req.user._id.toString()) {
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
                target: comment.target,
                targetType: comment.targetType,
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
                target: comment.target,
                targetType: comment.targetType,
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

        // 根据评论类型获取对应的模型
        const targetModel = comment.targetType === 'Article' ? Article : Diary;

        // 从目标的评论数组中移除
        await targetModel.findByIdAndUpdate(
            comment.target,
            { $pull: { comments: comment._id } }
        );

        await comment.deleteOne();
        res.json({ 
            code: SUCCESS.OK,
            message: '评论删除成功',
            data: null
        });
    } catch (error) {
        console.error(chalk.red('删除评论错误:'), error);
        res.status(500).json({ message: '删除评论失败' });
    }
};

// 获取所有评论（管理接口）
exports.getAllComments = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '', type } = req.query;

        // 构建查询条件
        const query = keyword ? {
            content: new RegExp(keyword, 'i')
        } : {};

        // 根据类型筛选
        if (type && ['Article', 'Diary'].includes(type)) {
            query.targetType = type;
        }

        const comments = await Comment.find(query)
            .populate('author', 'username avatar')
            .populate({
                path: 'target',
                refPath: 'targetType',
                select: 'title content'  // 文章有title，朋友圈有content
            })
            .populate({
                path: 'parentComment',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Comment.countDocuments(query);

        res.json({
            code: SUCCESS.OK,
            data: {
                comments,
                pagination: {
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    limit: parseInt(limit)
                }
            },
            message: '获取评论列表成功'
        });
    } catch (error) {
        console.error(chalk.red('获取评论列表错误:'), error);
        res.status(500).json({ message: '获取评论列表失败' });
    }
};

// 点赞评论
exports.likeComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        console.log('Liking comment:', { commentId: id, userId });

        const comment = await Comment.findById(id)
            .populate({
                path: 'author',
                select: '_id username avatar'
            });

        if (!comment) {
            console.log('Comment not found:', id);
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                message: '评论不存在'
            });
        }

        console.log('Found comment:', {
            id: comment._id,
            author: comment.author,
            content: comment.content
        });

        const isLiked = comment.likes.some(id => id.toString() === userId.toString());
        
        if (!isLiked) {
            comment.likes.push(userId);
            console.log('Creating notification for comment like');
            
            if (comment.author._id.toString() !== userId.toString()) {
                try {
                    const notification = await createCommentLikeNotification(req.user, comment);
                    console.log('Notification created successfully:', notification);
                } catch (notificationError) {
                    console.error('Failed to create notification:', notificationError);
                }
            } else {
                console.log('Skip notification - user liking their own comment');
            }
        } else {
            comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
            console.log('Unlike comment - removing like');
        }

        await comment.save();
        console.log('Comment saved successfully');

        res.json({
            code: SUCCESS.OK,
            data: {
                likes: comment.likes.length,
                isLiked: !isLiked
            },
            message: isLiked ? '取消点赞成功' : '点赞成功'
        });
    } catch (error) {
        console.error('Error in likeComment:', error);
        res.status(500).json({ message: '操作失败' });
    }
}; 
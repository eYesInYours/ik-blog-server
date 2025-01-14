const Comment = require('../models/Comment');
const Article = require('../models/Article');
const Diary = require('../models/Diary');
const User = require('../models/User');
const Notification = require('../models/Notification');
const chalk = require('chalk');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');
const {
    createCommentNotification,
    createReplyNotification,
    createCommentLikeNotification
} = require('./notificationController');

// 获取评论目标的作者信息
const getTargetAuthor = async (targetId, targetType) => {
    const Model = targetType === 'Article' ? Article : Diary;
    const target = await Model.findById(targetId).populate('author', 'username avatar');
    return target?.author;
};

// 创建评论通知
const handleCommentNotification = async (newComment, targetId, targetType, userId) => {
    const targetAuthor = await getTargetAuthor(targetId, targetType);
    
    if (targetAuthor && targetAuthor._id.toString() !== userId) {
        await createCommentNotification(newComment, {
            _id: targetId,
            author: targetAuthor,
            type: targetType
        });
    }
};

// 创建评论
exports.createComment = async (req, res) => {
    try {
        const { content, articleId, diaryId, parentCommentId } = req.body;
        
        // 确定评论目标
        const targetId = articleId || diaryId;
        const targetType = articleId ? 'Article' : 'Diary';
        
        if (!content || !targetId) {
            return res.status(400).json({
                message: '评论内容和目标ID不能为空'
            });
        }

        // 创建评论
        const comment = new Comment({
            content,
            targetId,
            targetType,
            author: req.user._id,
            parentComment: parentCommentId || null
        });

        await comment.save();
        await comment.populate('author', 'username avatar');

        const responseData = {
            _id: comment._id,
            content: comment.content,
            author: comment.author,
            createdAt: comment.createdAt,
            likes: 0,
            isLiked: false
        };

        // 处理通知
        if (parentCommentId) {
            const parentComment = await Comment.findById(parentCommentId)
                .populate('author', 'username avatar');
            await createReplyNotification(comment, parentComment);
        } else {
            await handleCommentNotification(comment, targetId, targetType, req.user._id);
        }

        res.status(201).json({
            code: SUCCESS.OK,
            data: responseData,
            message: '评论创建成功'
        });
    } catch (error) {
        console.error('创建评论错误:', error);
        res.status(500).json(error(SERVER_ERROR.INTERNAL_ERROR, '评论失败'));
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
            targetId,
            targetType,
            parentComment: null  // 只获取主评论
        })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .lean();

        // 获取所有回复
        const replies = await Comment.find({
            targetId,
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
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // 获取总评论数
        const total = await Comment.countDocuments();

        const comments = await Comment.find()
            .populate('author', 'username avatar')
            .populate({
                path: 'targetId',
                refPath: 'targetType'
            })
            .populate({
                path: 'parentComment',
                populate: {
                    path: 'author',
                    select: 'username avatar'
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const processedComments = comments.map(comment => {
            const commentObj = comment.toObject();
            commentObj.likes = comment.likes?.length || 0;
            return commentObj;
        });

        res.json(success({
            pagination: {
                total,
                limit: Number(limit),
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit)
            },
            comments: processedComments
        }));
    } catch (err) {
        console.error('获取评论列表错误:', err);
        res.status(SERVER_ERROR.INTERNAL_ERROR).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取评论列表失败')
        );
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
            // 添加点赞
            comment.likes.push(userId);
            console.log('Creating notification for comment like');

            // 如果不是给自己的评论点赞，才创建通知
            if (comment.author._id.toString() !== userId.toString()) {
                try {
                    await createCommentLikeNotification(req.user, comment);
                    console.log('Comment like notification created successfully');
                } catch (notificationError) {
                    console.error('Failed to create comment like notification:', notificationError);
                }
            } else {
                console.log('Skip notification - user liking their own comment');
            }
        } else {
            // 取消点赞
            comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
            console.log('Unlike comment - removing like');

            // 删除相关通知
            await Notification.deleteOne({
                recipient: comment.author._id,
                sender: userId,
                targetId: comment._id,
                action: 'comment_like'
            });
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
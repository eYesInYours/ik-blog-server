const Diary = require('../models/Diary');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const Comment = require('../models/Comment');

// 发布朋友圈
exports.createDiary = async (req, res) => {
    try {
        const { content, images, status } = req.body;
        
        const diary = new Diary({
            author: req.user._id,
            content,
            images: images || [],
            status: status || 'public'
        });

        await diary.save();

        res.status(SUCCESS.CREATED).json({
            code: SUCCESS.CREATED,
            message: '发布成功',
            data: diary
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            message: '发布失败'
        });
    }
};

// 获取朋友圈列表
exports.getDiaries = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        
        // 获取朋友圈基本信息
        const diaries = await Diary.find()
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // 获取所有日记的评论
        const diariesWithComments = await Promise.all(diaries.map(async diary => {
            // 获取主评论
            const mainComments = await Comment.find({
                targetId: diary._id,
                targetType: 'Diary',
                parentComment: null
            })
                .populate('author', 'username avatar')
                .sort({ createdAt: -1 })
                .lean();

            // 获取回复
            const replies = await Comment.find({
                targetId: diary._id,
                targetType: 'Diary',
                parentComment: { $ne: null }
            })
                .populate('author', 'username avatar')
                .populate({
                    path: 'parentComment',
                    select: 'author content',
                    populate: { path: 'author', select: 'username avatar' }
                })
                .sort({ createdAt: 1 })
                .lean();

            const diaryObj = diary.toObject();

            // 处理评论数据
            diaryObj.comments = mainComments.map(comment => {
                // 获取该评论的所有回复
                const commentReplies = replies.filter(reply =>
                    reply.parentComment._id.toString() === comment._id.toString()
                ).map(reply => {
                    const processedReply = {
                        ...reply,
                        likes: Array.isArray(reply.likes) ? reply.likes.length : 0,
                        isLiked: req.user ? (Array.isArray(reply.likes) && reply.likes.some(id => id.toString() === req.user._id.toString())) : false
                    };
                    const { author, content, _id } = reply.parentComment;
                    processedReply.replyTo = { author, content, _id };
                    return processedReply;
                });

                return {
                    ...comment,
                    likes: Array.isArray(comment.likes) ? comment.likes.length : 0,
                    isLiked: req.user ? (Array.isArray(comment.likes) && comment.likes.some(id => id.toString() === req.user._id.toString())) : false,
                    replies: commentReplies
                };
            });

            return {
                ...diaryObj,
                likes: Array.isArray(diary.likes) ? diary.likes.length : 0,
                isLiked: req.user ? (Array.isArray(diary.likes) && diary.likes.some(id => id.toString() === req.user._id.toString())) : false
            };
        }));

        const total = await Diary.countDocuments();

        res.json({
            code: SUCCESS.OK,
            data: {
                diaries: diariesWithComments,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error(chalk.red('获取朋友圈列表失败:', error));
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            message: '获取列表失败'
        });
    }
};

// 点赞/取消点赞
exports.toggleLike = async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);
        
        if (!diary) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                message: '朋友圈不存在'
            });
        }
        
        const index = diary.likes.indexOf(req.user._id);
        if (index === -1) {
            diary.likes.push(req.user._id);
        } else {
            diary.likes.splice(index, 1);
        }
        
        await diary.save();
        
        res.json({
            code: SUCCESS.OK,
            message: index === -1 ? '点赞成功' : '取消点赞成功',
            data: {
                likes: diary.likes.length
            }
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            message: '操作失败'
        });
    }
};

// 评论
exports.comment = async (req, res) => {
    try {
        const { content, replyTo } = req.body;
        const diary = await Diary.findById(req.params.id);
        
        diary.comments.push({
            author: req.user._id,
            content,
            replyTo
        });
        
        await diary.save();
        
        const populatedDiary = await Diary.findById(diary._id)
            .populate('comments.author', 'username avatar')
            .populate('comments.replyTo', 'username');
            
        res.json({
            code: SUCCESS.OK,
            message: '评论成功',
            data: populatedDiary.comments[populatedDiary.comments.length - 1]
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            message: '评论失败'
        });
    }
};

// 删除朋友圈
exports.deleteDiary = async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);
        
        if (!diary) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                message: '朋友圈不存在'
            });
        }
        
        if (diary.author.toString() !== req.user._id.toString()) {
            return res.status(CLIENT_ERROR.FORBIDDEN).json({
                message: '无权删除'
            });
        }
        
        await diary.deleteOne();
        
        res.json({
            code: SUCCESS.OK,
            message: '删除成功'
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            message: '删除失败'
        });
    }
};




// 管理接口：获取所有朋友圈
exports.getAllDiaries = async (req, res) => {
    try {
        const { page = 1, limit = 10, keyword = '' } = req.query;
        
        const query = keyword ? {
            content: new RegExp(keyword, 'i')
        } : {};
        
        const diaries = await Diary.find(query)
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        const total = await Diary.countDocuments(query);
        
        res.json({
            code: SUCCESS.OK,
            data: {
                diaries,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            message: '获取列表失败'
        });
    }
}; 
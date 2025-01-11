// 通知动作类型
exports.NOTIFICATION_ACTIONS = {
  COMMENT_ARTICLE: '评论了你的文章',
  REPLY_COMMENT: '回复了你的评论',
  LIKE_ARTICLE: '点赞了你的文章',
  LIKE_COMMENT: '点赞了你的评论'
}

// 通知类型
exports.NOTIFICATION_TYPES = {
  ARTICLE_LIKE: 'article_like',     // 文章点赞通知
  ARTICLE_COLLECT: 'article_collect', // 文章收藏通知
  ARTICLE_COMMENT: 'article_comment', // 文章评论通知
  COMMENT_LIKE: 'comment_like',     // 评论点赞通知
  COMMENT_REPLY: 'comment_reply'    // 评论回复通知
} 
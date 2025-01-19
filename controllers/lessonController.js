const { Lesson, LessonRecord } = require('../models/Lesson');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');

// 获取用户课时列表
exports.getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      code: SUCCESS.OK,
      data: lessons
    });
  } catch (error) {
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({
      code: SERVER_ERROR.INTERNAL_ERROR,
      message: '获取课时列表失败'
    });
  }
};

// 获取课时使用记录
exports.getLessonRecords = async (req, res) => {
  try {
    const records = await LessonRecord.find({ userId: req.user._id })
      .populate('lessonId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      code: SUCCESS.OK,
      data: records
    });
  } catch (error) {
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({
      code: SERVER_ERROR.INTERNAL_ERROR,
      message: '获取使用记录失败'
    });
  }
};

// 创建课时(充值)
exports.createLesson = async (req, res) => {
  try {
    const { title, duration } = req.body;

    const lesson = new Lesson({
      userId: req.user._id,
      title,
      duration,
      remainingTime: duration
    });

    await lesson.save();

    res.status(SUCCESS.CREATED).json({
      code: SUCCESS.CREATED,
      message: '课时创建成功',
      data: lesson
    });
  } catch (error) {
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({
      code: SERVER_ERROR.INTERNAL_ERROR,
      message: '课时创建失败'
    });
  }
};

// 使用课时
exports.useLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { duration, teacherName } = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(CLIENT_ERROR.NOT_FOUND).json({
        code: CLIENT_ERROR.NOT_FOUND,
        message: '课时不存在'
      });
    }

    if (lesson.remainingTime < duration) {
      return res.status(CLIENT_ERROR.BAD_REQUEST).json({
        code: CLIENT_ERROR.BAD_REQUEST,
        message: '剩余课时不足'
      });
    }

    // 记录使用记录
    const record = new LessonRecord({
      lessonId,
      userId: req.user._id,
      duration,
      teacherName
    });

    // 更新剩余课时
    lesson.remainingTime -= duration;
    if (lesson.remainingTime === 0) {
      lesson.status = 'used';
    }

    await Promise.all([record.save(), lesson.save()]);

    res.json({
      code: SUCCESS.OK,
      message: '课时使用成功',
      data: {
        record,
        lesson
      }
    });
  } catch (error) {
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({
      code: SERVER_ERROR.INTERNAL_ERROR,
      message: '课时使用失败'
    });
  }
};

// 获取用户课时统计
exports.getLessonStats = async (req, res) => {
  try {
    const [lessons, records] = await Promise.all([
      Lesson.find({ userId: req.user._id }),
      LessonRecord.find({ userId: req.user._id })
    ]);

    const stats = {
      totalMinutes: lessons.reduce((sum, lesson) => sum + lesson.duration, 0),
      remainingMinutes: lessons.reduce((sum, lesson) => sum + lesson.remainingTime, 0),
      completedLessons: records.filter(record => record.status === 'completed').length,
      totalSpent: lessons.reduce((sum, lesson) => sum + lesson.duration * 10, 0) // 假设每分钟10元
    };

    res.json({
      code: SUCCESS.OK,
      data: stats
    });
  } catch (error) {
    res.status(SERVER_ERROR.INTERNAL_ERROR).json({
      code: SERVER_ERROR.INTERNAL_ERROR,
      message: '获取统计数据失败'
    });
  }
}; 
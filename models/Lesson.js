const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  remainingTime: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'used'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 课时使用记录子文档
const lessonRecordSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  teacherName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Lesson = mongoose.model('Lesson', lessonSchema);
const LessonRecord = mongoose.model('LessonRecord', lessonRecordSchema);

module.exports = { Lesson, LessonRecord }; 
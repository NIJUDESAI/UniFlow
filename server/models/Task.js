import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    id: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      default: 'General',
      trim: true
    },
    time: {
      type: String,
      default: 'Today',
      trim: true
    },
    done: {
      type: Boolean,
      default: false
    }
  },
  {
    versionKey: false,
    timestamps: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id
        delete ret.__v
        return ret
      }
    }
  }
)

// Compound unique index ensuring each user has their own unique task ID sequence
taskSchema.index({ userId: 1, id: 1 }, { unique: true })

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema)
export default Task

import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
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

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema)
export default Task

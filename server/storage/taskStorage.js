import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Task from '../models/Task.js'
import { isDbConnected } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to tasks.json located in the server root folder
const TASKS_FILE = path.join(__dirname, '..', 'tasks.json')

export const DEFAULT_TASKS = [
  { id: 1, title: 'Complete DSA practice', subject: 'Data Structures', time: '10:30 AM', done: true },
  { id: 2, title: 'Revise database concepts', subject: 'Database Management', time: '1:00 PM', done: false },
  { id: 3, title: 'Prepare web development lab', subject: 'Web Development', time: '4:00 PM', done: false }
]

// Safely read tasks from tasks.json file
export function readTasks() {
  try {
    if (!fs.existsSync(TASKS_FILE)) {
      fs.writeFileSync(TASKS_FILE, JSON.stringify(DEFAULT_TASKS, null, 2), 'utf-8')
      return DEFAULT_TASKS
    }
    const data = fs.readFileSync(TASKS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return DEFAULT_TASKS
  } catch (error) {
    console.error('Error reading tasks file:', error.message)
    return DEFAULT_TASKS
  }
}

// Safely write tasks to tasks.json file
export function writeTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error writing tasks file:', error.message)
    return false
  }
}

/**
 * Seeding placeholder preserved for server startup compatibility.
 * In multi-user authenticated mode, global unassigned tasks are not seeded
 * so each registered student starts with their own private tasks.
 */
export async function seedTasksToMongoIfEmpty() {
  // Preserved for compatibility with server/index.js
  return
}

/**
 * Return all tasks belonging strictly to the specified user.
 * Legacy tasks without a matching userId are never returned.
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Array>}
 */
export async function getAllTasks(userId) {
  if (!userId) {
    return []
  }

  if (isDbConnected()) {
    try {
      const tasks = await Task.find({ userId }, { _id: 0, __v: 0 }).sort({ id: 1 }).lean()
      return tasks
    } catch (error) {
      console.error('[MongoDB] Failed to retrieve tasks from database, falling back to JSON storage:', error.message)
    }
  }

  // Fallback to local JSON storage filtered strictly by matching userId
  const tasks = readTasks()
  return tasks
    .filter(t => t.userId && String(t.userId) === String(userId))
    .map(t => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      time: t.time,
      done: t.done
    }))
}

/**
 * Create and persist a new task for the authenticated user.
 * Generates an independent task ID sequence per user on the backend.
 * @param {{ title: string, subject?: string, time?: string, done?: boolean }} taskData
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<object>}
 */
export async function createTask(taskData, userId) {
  if (!userId) {
    throw new Error('User ID is required to create a task')
  }

  const { title, subject, time, done } = taskData || {}

  if (isDbConnected()) {
    try {
      // Find the highest task ID belonging to that user and add 1
      const lastTask = await Task.findOne({ userId }).sort({ id: -1 }).select('id').lean()
      let finalId = lastTask && typeof lastTask.id === 'number' ? lastTask.id + 1 : 1

      while (await Task.exists({ userId, id: finalId })) {
        finalId++
      }

      const created = await Task.create({
        userId,
        id: finalId,
        title: title.trim(),
        subject: (subject && typeof subject === 'string' && subject.trim()) || 'General',
        time: (time && typeof time === 'string' && time.trim()) || 'Today',
        done: Boolean(done)
      })

      return {
        id: created.id,
        title: created.title,
        subject: created.subject,
        time: created.time,
        done: created.done
      }
    } catch (error) {
      console.error('[MongoDB] Failed to create task in database, falling back to JSON storage:', error.message)
    }
  }

  // Fallback to local JSON storage
  const tasks = readTasks()
  const userTasks = tasks.filter(t => t.userId && String(t.userId) === String(userId))

  // Find the highest task ID belonging to that user and add 1
  const maxId = userTasks.reduce((max, t) => (typeof t.id === 'number' && t.id > max ? t.id : max), 0)
  let finalId = maxId + 1

  while (userTasks.some(t => t.id === finalId)) {
    finalId++
  }

  const newTask = {
    userId: String(userId),
    id: finalId,
    title: title.trim(),
    subject: (subject && typeof subject === 'string' && subject.trim()) || 'General',
    time: (time && typeof time === 'string' && time.trim()) || 'Today',
    done: Boolean(done)
  }

  tasks.push(newTask)
  writeTasks(tasks)

  return {
    id: newTask.id,
    title: newTask.title,
    subject: newTask.subject,
    time: newTask.time,
    done: newTask.done
  }
}

/**
 * Update an existing task belonging to the authenticated user.
 * Rejects modifications if the task does not belong to the user.
 * Ignores any attempt to modify userId or id.
 * @param {number} taskId
 * @param {object} updates
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<object|null>}
 */
export async function updateTask(taskId, updates = {}, userId) {
  if (!userId) {
    return null
  }

  if (isDbConnected()) {
    try {
      const task = await Task.findOne({ id: taskId, userId })
      if (!task) {
        return null
      }

      // Update done status if provided, or toggle it
      if (typeof updates.done === 'boolean') {
        task.done = updates.done
      } else if (updates.done !== undefined) {
        task.done = Boolean(updates.done)
      } else {
        task.done = !task.done
      }

      // Update descriptive fields if provided (never allow changing userId or id)
      if (updates.title && typeof updates.title === 'string' && updates.title.trim()) {
        task.title = updates.title.trim()
      }
      if (updates.subject && typeof updates.subject === 'string') {
        task.subject = updates.subject.trim() || 'General'
      }
      if (updates.time && typeof updates.time === 'string') {
        task.time = updates.time.trim() || 'Today'
      }

      await task.save()

      return {
        id: task.id,
        title: task.title,
        subject: task.subject,
        time: task.time,
        done: task.done
      }
    } catch (error) {
      console.error(`[MongoDB] Failed to update task ${taskId} in database, falling back to JSON storage:`, error.message)
    }
  }

  // Fallback to local JSON storage
  const tasks = readTasks()
  const taskIndex = tasks.findIndex(
    t => t.id === taskId && t.userId && String(t.userId) === String(userId)
  )

  if (taskIndex === -1) {
    return null
  }

  if (typeof updates.done === 'boolean') {
    tasks[taskIndex].done = updates.done
  } else if (updates.done !== undefined) {
    tasks[taskIndex].done = Boolean(updates.done)
  } else {
    tasks[taskIndex].done = !tasks[taskIndex].done
  }

  if (updates.title && typeof updates.title === 'string' && updates.title.trim()) {
    tasks[taskIndex].title = updates.title.trim()
  }
  if (updates.subject && typeof updates.subject === 'string') {
    tasks[taskIndex].subject = updates.subject.trim() || 'General'
  }
  if (updates.time && typeof updates.time === 'string') {
    tasks[taskIndex].time = updates.time.trim() || 'Today'
  }

  writeTasks(tasks)

  return {
    id: tasks[taskIndex].id,
    title: tasks[taskIndex].title,
    subject: tasks[taskIndex].subject,
    time: tasks[taskIndex].time,
    done: tasks[taskIndex].done
  }
}

/**
 * Delete a task belonging to the authenticated user.
 * Rejects deletion if the task belongs to another user or does not exist.
 * @param {number} taskId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<object|null>}
 */
export async function deleteTask(taskId, userId) {
  if (!userId) {
    return null
  }

  if (isDbConnected()) {
    try {
      const deletedTask = await Task.findOneAndDelete({ id: taskId, userId })
      if (!deletedTask) {
        return null
      }

      return {
        id: deletedTask.id,
        title: deletedTask.title,
        subject: deletedTask.subject,
        time: deletedTask.time,
        done: deletedTask.done
      }
    } catch (error) {
      console.error(`[MongoDB] Failed to delete task ${taskId} from database, falling back to JSON storage:`, error.message)
    }
  }

  // Fallback to local JSON storage
  const tasks = readTasks()
  const taskIndex = tasks.findIndex(
    t => t.id === taskId && t.userId && String(t.userId) === String(userId)
  )

  if (taskIndex === -1) {
    return null
  }

  const [removed] = tasks.splice(taskIndex, 1)
  writeTasks(tasks)

  return {
    id: removed.id,
    title: removed.title,
    subject: removed.subject,
    time: removed.time,
    done: removed.done
  }
}

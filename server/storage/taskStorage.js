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
 * Seed MongoDB with existing tasks from tasks.json if the collection is empty.
 * Ensures smooth transition without data loss.
 */
export async function seedTasksToMongoIfEmpty() {
  if (!isDbConnected()) return

  try {
    const count = await Task.countDocuments()
    if (count === 0) {
      const existingTasks = readTasks()
      if (Array.isArray(existingTasks) && existingTasks.length > 0) {
        console.log(`[MongoDB] Initializing tasks collection with ${existingTasks.length} existing tasks from tasks.json...`)
        const tasksToInsert = existingTasks.map(t => ({
          id: Number(t.id),
          title: String(t.title || '').trim(),
          subject: (t.subject && String(t.subject).trim()) || 'General',
          time: (t.time && String(t.time).trim()) || 'Today',
          done: Boolean(t.done)
        }))
        await Task.insertMany(tasksToInsert)
        console.log('[MongoDB] Tasks collection seeded successfully.')
      }
    }
  } catch (error) {
    console.error('[MongoDB] Error seeding initial tasks:', error.message)
  }
}

/**
 * Return all tasks (from MongoDB Atlas if connected, otherwise fallback to tasks.json)
 */
export async function getAllTasks() {
  if (isDbConnected()) {
    try {
      const tasks = await Task.find({}, { _id: 0, __v: 0 }).sort({ id: 1 }).lean()
      return tasks
    } catch (error) {
      console.error('[MongoDB] Failed to retrieve tasks from database, falling back to JSON storage:', error.message)
    }
  }

  return readTasks()
}

/**
 * Create and persist a new task
 */
export async function createTask({ title, subject, time, done, id }) {
  if (isDbConnected()) {
    try {
      let finalId = id ? Number(id) : null
      if (!finalId || isNaN(finalId) || finalId <= 0) {
        const lastTask = await Task.findOne().sort({ id: -1 }).select('id').lean()
        finalId = lastTask && typeof lastTask.id === 'number' ? lastTask.id + 1 : 1
      }

      while (await Task.exists({ id: finalId })) {
        finalId++
      }

      const created = await Task.create({
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
  let finalId = id ? Number(id) : Date.now()
  if (isNaN(finalId) || finalId <= 0) {
    finalId = Date.now()
  }
  while (tasks.some(t => t.id === finalId)) {
    finalId++
  }

  const newTask = {
    id: finalId,
    title: title.trim(),
    subject: (subject && typeof subject === 'string' && subject.trim()) || 'General',
    time: (time && typeof time === 'string' && time.trim()) || 'Today',
    done: Boolean(done)
  }

  tasks.push(newTask)
  writeTasks(tasks)
  return newTask
}

/**
 * Update an existing task by ID
 */
export async function updateTask(taskId, updates = {}) {
  if (isDbConnected()) {
    try {
      const task = await Task.findOne({ id: taskId })
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

      // Optionally update other fields if provided
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
  const taskIndex = tasks.findIndex(t => t.id === taskId)

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
  return tasks[taskIndex]
}

import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TASKS_FILE = path.join(__dirname, 'tasks.json')

const DEFAULT_TASKS = [
  { id: 1, title: 'Complete DSA practice', subject: 'Data Structures', time: '10:30 AM', done: true },
  { id: 2, title: 'Revise database concepts', subject: 'Database Management', time: '1:00 PM', done: false },
  { id: 3, title: 'Prepare web development lab', subject: 'Web Development', time: '4:00 PM', done: false }
]

// Safely read tasks from tasks.json file
function readTasks() {
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
    console.error('Error reading tasks file:', error)
    return DEFAULT_TASKS
  }
}

// Safely write tasks to tasks.json file
function writeTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error writing tasks file:', error)
    return false
  }
}

const app = express()
const PORT = process.env.PORT || 5000

// Enable CORS for the React frontend (running on Vite at localhost:5173 or localhost:5174)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174']
}))

// Middleware to parse incoming JSON bodies
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'UniFlow backend server is running',
    timestamp: new Date().toISOString()
  })
})

// GET /api/tasks - Retrieve all tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = readTasks()
    res.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    res.status(500).json({ error: 'Failed to retrieve tasks' })
  }
})

// POST /api/tasks - Create a new task
app.post('/api/tasks', (req, res) => {
  try {
    const { title, subject, time, done, id } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' })
    }

    const tasks = readTasks()

    // Ensure a unique ID
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

    res.status(201).json(newTask)
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// PATCH /api/tasks/:id - Update a task's completed status
app.patch('/api/tasks/:id', (req, res) => {
  try {
    const taskId = Number(req.params.id)
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' })
    }

    const tasks = readTasks()
    const taskIndex = tasks.findIndex(t => t.id === taskId)

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Update done status if provided, or toggle it
    if (req.body && typeof req.body.done === 'boolean') {
      tasks[taskIndex].done = req.body.done
    } else if (req.body && req.body.done !== undefined) {
      tasks[taskIndex].done = Boolean(req.body.done)
    } else {
      tasks[taskIndex].done = !tasks[taskIndex].done
    }

    // Optionally update other fields if provided
    if (req.body && req.body.title && typeof req.body.title === 'string' && req.body.title.trim()) {
      tasks[taskIndex].title = req.body.title.trim()
    }
    if (req.body && req.body.subject && typeof req.body.subject === 'string') {
      tasks[taskIndex].subject = req.body.subject.trim() || 'General'
    }
    if (req.body && req.body.time && typeof req.body.time === 'string') {
      tasks[taskIndex].time = req.body.time.trim() || 'Today'
    }

    writeTasks(tasks)
    res.json(tasks[taskIndex])
  } catch (error) {
    console.error(`PATCH /api/tasks/${req.params.id} error:`, error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Start the server on port 5000
app.listen(PORT, () => {
  console.log(`UniFlow server is running on http://localhost:${PORT}`)
})

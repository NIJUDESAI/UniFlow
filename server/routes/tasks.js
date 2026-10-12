import express from 'express'
import {
  getAllTasks,
  createTask,
  updateTask
} from '../storage/taskStorage.js'

const router = express.Router()

// GET /api/tasks - Retrieve all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await getAllTasks()
    res.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks error:', error.message)
    res.status(500).json({ error: 'Failed to retrieve tasks' })
  }
})

// POST /api/tasks - Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, subject, time, done, id } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' })
    }

    const newTask = await createTask({ title, subject, time, done, id })
    res.status(201).json(newTask)
  } catch (error) {
    console.error('POST /api/tasks error:', error.message)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// PATCH /api/tasks/:id - Update a task's completed status
router.patch('/:id', async (req, res) => {
  try {
    const taskId = Number(req.params.id)
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' })
    }

    const updatedTask = await updateTask(taskId, req.body)
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json(updatedTask)
  } catch (error) {
    console.error(`PATCH /api/tasks/${req.params.id} error:`, error.message)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

export default router

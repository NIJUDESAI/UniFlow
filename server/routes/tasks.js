import express from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask
} from '../storage/taskStorage.js'

const router = express.Router()

// Require JWT authentication for all task operations
router.use(authMiddleware)

// GET /api/tasks - Retrieve all tasks belonging to the authenticated student
router.get('/', async (req, res) => {
  try {
    const tasks = await getAllTasks(req.userId)
    res.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks error:', error.message)
    res.status(500).json({ error: 'Failed to retrieve tasks' })
  }
})

// POST /api/tasks - Create a new task for the authenticated student
router.post('/', async (req, res) => {
  try {
    const { title, subject, time, done } = req.body || {}

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' })
    }

    // Pass only allowable fields to createTask; client cannot provide task ID or userId
    const newTask = await createTask({ title, subject, time, done }, req.userId)
    res.status(201).json(newTask)
  } catch (error) {
    console.error('POST /api/tasks error:', error.message)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// PATCH /api/tasks/:id - Update an existing task belonging to the authenticated student
router.patch('/:id', async (req, res) => {
  try {
    const taskId = Number(req.params.id)
    if (isNaN(taskId) || !Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'Invalid task ID. Must be a positive integer.' })
    }

    const updatedTask = await updateTask(taskId, req.body, req.userId)
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json(updatedTask)
  } catch (error) {
    console.error(`PATCH /api/tasks/${req.params.id} error:`, error.message)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// DELETE /api/tasks/:id - Delete a task belonging to the authenticated student
router.delete('/:id', async (req, res) => {
  try {
    const taskId = Number(req.params.id)
    if (isNaN(taskId) || !Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'Invalid task ID. Must be a positive integer.' })
    }

    const deletedTask = await deleteTask(taskId, req.userId)
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json({ message: 'Task deleted successfully', task: deletedTask })
  } catch (error) {
    console.error(`DELETE /api/tasks/${req.params.id} error:`, error.message)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

export default router

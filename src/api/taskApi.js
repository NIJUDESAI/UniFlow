const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Fetch all tasks from the backend API
 * @returns {Promise<Array<{ id: number, title: string, subject: string, time: string, done: boolean }>>}
 */
export async function fetchTasks() {
  const response = await fetch(`${API_BASE_URL}/tasks`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || `Failed to fetch tasks (HTTP ${response.status})`)
  }
  return response.json()
}

/**
 * Create a new task via POST /api/tasks
 * @param {{ title: string, subject?: string, time?: string, done?: boolean }} taskData
 * @returns {Promise<{ id: number, title: string, subject: string, time: string, done: boolean }>}
 */
export async function createTask(taskData) {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || `Failed to create task (HTTP ${response.status})`)
  }

  return response.json()
}

/**
 * Update an existing task via PATCH /api/tasks/:id
 * @param {number} taskId
 * @param {object} updates e.g. { done: boolean }
 * @returns {Promise<{ id: number, title: string, subject: string, time: string, done: boolean }>}
 */
export async function updateTask(taskId, updates) {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || `Failed to update task (HTTP ${response.status})`)
  }

  return response.json()
}

/**
 * Check backend health status via GET /api/health
 * @returns {Promise<{ status: string, message: string, mongodb?: object }>}
 */
export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed (HTTP ${response.status})`)
  }
  return response.json()
}

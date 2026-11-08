const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Fetch all tasks for the authenticated student.
 * Sends GET /api/tasks with Authorization Bearer token.
 *
 * @param {string} token - The student's JWT token
 * @returns {Promise<Array<{ id: number, title: string, subject: string, time: string, done: boolean }>>}
 */
export async function fetchTasks(token) {
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const error = new Error(errorData?.error || `Failed to fetch tasks (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Create a new task for the authenticated student.
 * Sends POST /api/tasks with JSON body and Authorization Bearer token.
 *
 * @param {{ title: string, subject?: string, time?: string, done?: boolean }} taskData
 * @param {string} token - The student's JWT token
 * @returns {Promise<{ id: number, title: string, subject: string, time: string, done: boolean }>}
 */
export async function createTask(taskData, token) {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(taskData)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const error = new Error(errorData?.error || `Failed to create task (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Update an existing task belonging to the authenticated student.
 * Sends PATCH /api/tasks/:id with JSON updates and Authorization Bearer token.
 *
 * @param {number} taskId
 * @param {object} updates e.g. { done: boolean }
 * @param {string} token - The student's JWT token
 * @returns {Promise<{ id: number, title: string, subject: string, time: string, done: boolean }>}
 */
export async function updateTask(taskId, updates, token) {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const error = new Error(errorData?.error || `Failed to update task (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Delete a task belonging to the authenticated student.
 * Sends DELETE /api/tasks/:id with Authorization Bearer token.
 *
 * @param {number} taskId
 * @param {string} token - The student's JWT token
 * @returns {Promise<{ message: string, task?: object }>}
 */
export async function deleteTask(taskId, token) {
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const error = new Error(errorData?.error || `Failed to delete task (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Check backend health status via GET /api/health (public endpoint, no token required).
 *
 * @returns {Promise<{ status: string, message: string, mongodb?: object }>}
 */
export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    const error = new Error(`Health check failed (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }
  return response.json()
}

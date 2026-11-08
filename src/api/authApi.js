const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Register a new student account.
 * Sends POST request to /api/auth/register.
 *
 * @param {{ name: string, email: string, password: string }} credentials
 * @returns {Promise<{ message: string, token: string, user: object }>}
 */
export async function registerStudent({ name, email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, email, password })
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.error || `Registration failed (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

/**
 * Authenticate an existing student.
 * Sends POST request to /api/auth/login.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ message: string, token: string, user: object }>}
 */
export async function loginStudent({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.error || `Login failed (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

/**
 * Fetch the authenticated student's profile.
 * Sends GET request to /api/auth/me with Bearer token.
 *
 * @param {string} token - The student's JWT token
 * @returns {Promise<{ user: object }>}
 */
export async function getStudentProfile(token) {
  if (!token) {
    const error = new Error('Authentication token is required')
    error.status = 401
    throw error
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.error || `Failed to fetch profile (HTTP ${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

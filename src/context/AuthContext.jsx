import { createContext, useContext, useState, useEffect } from 'react'
import { loginStudent, registerStudent, getStudentProfile } from '../api/authApi.js'

const TOKEN_KEY = 'uniflow_token'

const AuthContext = createContext(null)

/**
 * Authentication Provider component that manages the logged-in student state,
 * handles token storage in localStorage, and provides login, register, and logout handlers.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verify stored token on initial application load
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem(TOKEN_KEY)

      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await getStudentProfile(storedToken)
        if (response && response.user) {
          setUser(response.user)
          setToken(storedToken)
        } else {
          // Token response format is unexpected; treat as invalid
          localStorage.removeItem(TOKEN_KEY)
          setUser(null)
          setToken(null)
        }
      } catch (error) {
        // If the server explicitly rejected the token (401 Unauthorized or 403 Forbidden),
        // the session is invalid or expired: clear the stored token.
        if (error?.status === 401 || error?.status === 403) {
          localStorage.removeItem(TOKEN_KEY)
          setUser(null)
          setToken(null)
        } else {
          // If the backend is unavailable, network failed, or returned a 500 error:
          // Do NOT delete the token from localStorage.
          // Keep user unauthenticated in React state until session can be verified.
          setUser(null)
          setToken(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  /**
   * Log in a student with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Auth response data
   */
  const login = async (email, password) => {
    setIsLoading(true)
    try {
      const data = await loginStudent({ email, password })

      if (data?.token && data?.user) {
        localStorage.setItem(TOKEN_KEY, data.token)
        setToken(data.token)
        setUser(data.user)
        return data
      }

      throw new Error('Incomplete login response from server')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Register a new student account.
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Auth response data
   */
  const register = async (name, email, password) => {
    setIsLoading(true)
    try {
      const data = await registerStudent({ name, email, password })

      if (data?.token && data?.user) {
        localStorage.setItem(TOKEN_KEY, data.token)
        setToken(data.token)
        setUser(data.user)
        return data
      }

      throw new Error('Incomplete registration response from server')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Log out the current student by removing the token and clearing user state.
   */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook to access authentication context.
 * Throws a descriptive error if used outside an AuthProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthProvider

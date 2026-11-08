import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

/**
 * Helper function to sign a 7-day JWT token with userId payload.
 * Throws an error if JWT_SECRET is not configured in the environment.
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {string} Signed JWT token
 */
function generateToken(userId) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET_MISSING')
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' })
}

/**
 * POST /register
 * Register a new student account.
 * - Validates input fields and password length (min 8 chars)
 * - Checks for existing registered email (HTTP 409 if duplicate)
 * - Hashes password automatically via User model pre-save hook
 * - Returns HTTP 201 with JWT token and sanitized user object
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Student name is required.' })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Valid email address is required.' })
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' })
    }

    // 2. Validate minimum password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 3. Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' })
    }

    // 4. Create new user (User schema automatically handles bcrypt hashing)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password
    })

    // 5. Generate authentication token
    let token
    try {
      token = generateToken(user._id)
    } catch (tokenErr) {
      console.error('[Auth Route] JWT signing failed: check JWT_SECRET configuration')
      return res.status(500).json({ error: 'Authentication service configuration error.' })
    }

    // 6. Return response (toJSON transform automatically strips password)
    return res.status(201).json({
      message: 'Student account created successfully.',
      token,
      user
    })
  } catch (error) {
    // Handle MongoDB duplicate key index error (code 11000)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email address already exists.' })
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ error: messages.join(', ') })
    }

    console.error('[Auth Route] Unexpected error during registration')
    return res.status(500).json({ error: 'Failed to register student account. Please try again.' })
  }
})

/**
 * POST /login
 * Authenticate student and issue a JWT token.
 * - Validates email and password presence
 * - Looks up student by email
 * - Verifies password using user.comparePassword()
 * - Returns token and sanitized user details
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // 1. Validate required fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your email address.' })
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please enter your password.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 2. Find user by normalized email
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      // Use generic error to avoid exposing whether an email is registered
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // 3. Verify password against the stored bcrypt hash
    const isPasswordMatch = await user.comparePassword(password)
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // 4. Generate authentication token
    let token
    try {
      token = generateToken(user._id)
    } catch (tokenErr) {
      console.error('[Auth Route] JWT signing failed: check JWT_SECRET configuration')
      return res.status(500).json({ error: 'Authentication service configuration error.' })
    }

    // 5. Return token and sanitized user details
    return res.json({
      message: 'Login successful.',
      token,
      user
    })
  } catch (error) {
    console.error('[Auth Route] Unexpected error during login')
    return res.status(500).json({ error: 'An unexpected error occurred during login. Please try again.' })
  }
})

/**
 * GET /me
 * Protected endpoint returning the currently logged-in student's profile.
 * Requires valid Bearer token handled by authMiddleware.
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.user is attached by authMiddleware with password already excluded
    return res.json({
      user: req.user
    })
  } catch (error) {
    console.error('[Auth Route] Unexpected error fetching profile')
    return res.status(500).json({ error: 'Failed to retrieve student profile.' })
  }
})

export default router


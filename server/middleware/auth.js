import jwt from 'jsonwebtoken'
import User from '../models/User.js'

/**
 * Authentication middleware to verify JWT tokens and protect routes.
 *
 * 1. Checks for the Authorization header formatted as: Bearer <token>
 * 2. Verifies the token against process.env.JWT_SECRET
 * 3. Finds the student in MongoDB by the decoded userId
 * 4. Attaches the authenticated user to req.user and proceeds to the next handler
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    // Check if the Authorization header is present and uses Bearer scheme
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No authentication token provided.'
      })
    }

    // Extract the token after 'Bearer '
    const token = authHeader.split(' ')[1]?.trim()
    if (!token) {
      return res.status(401).json({
        error: 'Access denied. Malformed authorization token.'
      })
    }

    // Ensure JWT_SECRET is configured on the server
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('[Auth Middleware] Server configuration error: JWT_SECRET is not set.')
      return res.status(500).json({
        error: 'Authentication service is currently unavailable.'
      })
    }

    // Verify the JWT token
    let decoded
    try {
      decoded = jwt.verify(token, secret)
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Your session has expired. Please log in again.'
        })
      }
      return res.status(401).json({
        error: 'Invalid or expired authentication token.'
      })
    }

    // Ensure the payload contains a valid userId
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Invalid token payload.'
      })
    }

    // Look up the user in MongoDB, safely excluding the password hash
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(401).json({
        error: 'User not found. Session is no longer valid.'
      })
    }

    // Attach authenticated user to request object
    req.user = user
    req.userId = user._id

    next()
  } catch (error) {
    // Log unexpected errors safely without exposing credentials or payload details
    console.error('[Auth Middleware] Authentication processing error')
    return res.status(500).json({
      error: 'An internal server error occurred during authentication.'
    })
  }
}

export default authMiddleware


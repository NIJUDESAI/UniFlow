import path from 'path'
import { fileURLToPath } from 'url'
import dns from 'dns'
import http from 'http'
import https from 'https'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure DNS fallback for SRV lookup resilience (resolves Windows/local router EBADRESP errors)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch {
  // Ignore if custom DNS cannot be set in current environment
}

// Load environment variables securely from server/.env
const envPath = path.resolve(__dirname, '.env')
dotenv.config({ path: envPath })
try {
  process.loadEnvFile(envPath)
} catch {
  // Optional if already loaded by dotenv or environment
}

/**
 * Safely fetch current public IP with a short timeout for diagnostic reporting
 * @returns {Promise<string|null>}
 */
async function fetchCurrentPublicIp() {
  return new Promise((resolve) => {
    const req = https.get('https://api.ipify.org', { timeout: 2000 }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve(data.trim()))
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
  })
}

/**
 * Sanitize any credentials from error messages or URIs
 * @param {string} text
 * @returns {string}
 */
function sanitizeSecrets(text) {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/gi, 'mongodb$1://$2:****@')
}

let connectionPromise = null

/**
 * Check if MongoDB connection is active
 * @returns {boolean}
 */
export function isDbConnected() {
  return mongoose.connection.readyState === 1
}

/**
 * Get current database connection status details
 * @returns {{ connected: boolean, status: string, database: string, storageType: string, fallbackActive: boolean }}
 */
export function getDbStatus() {
  const readyState = mongoose.connection.readyState
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }

  const isConnected = readyState === 1
  return {
    connected: isConnected,
    status: statusMap[readyState] || 'unknown',
    database: 'uniflow',
    storageType: isConnected ? 'mongodb' : 'json',
    fallbackActive: !isConnected
  }
}

/**
 * Connect to MongoDB database named 'uniflow'
 */
export async function connectDB() {
  // Prevent duplicate concurrent connection attempts
  if (isDbConnected()) {
    return mongoose.connection
  }
  if (connectionPromise) {
    return connectionPromise
  }

  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.warn('[MongoDB] Warning: MONGODB_URI is not set in server/.env. Using local JSON storage.')
    return null
  }

  connectionPromise = (async () => {
    try {
      const conn = await mongoose.connect(uri, {
        dbName: 'uniflow',
        serverSelectionTimeoutMS: 5000
      })

      console.log(`[MongoDB] Connected successfully to database: ${conn.connection.name}`)
      return conn
    } catch (error) {
      const sanitizedMsg = sanitizeSecrets(error.message)
      const isAtlasIpOrTlsIssue =
        sanitizedMsg.includes('Could not connect to any servers in your MongoDB Atlas cluster') ||
        sanitizedMsg.includes('whitelist') ||
        sanitizedMsg.includes('SSL alert number 80') ||
        sanitizedMsg.includes('tlsv1 alert internal error')

      if (isAtlasIpOrTlsIssue) {
        const publicIp = await fetchCurrentPublicIp()
        console.error('\n--- [MongoDB Atlas Connection Diagnostics] ---')
        console.error('Issue: Atlas TLS Handshake Rejected (SSL alert number 80 / Cluster unreachable).')
        console.error('Root Cause: In MongoDB Atlas, TLS alert 80 is returned by the cluster gateway when the connecting IP address is not permitted in Atlas Network Access.')
        if (publicIp) {
          console.error(`Detected Outbound IP: ${publicIp}`)
          console.error(`Fix: Go to Atlas Dashboard -> Network Access -> IP Access List, and ensure ${publicIp} is added and Active (or add 0.0.0.0/0 temporarily to test).`)
        } else {
          console.error('Fix: Check your current public IP and verify it is active in Atlas Dashboard -> Network Access.')
        }
        console.error('Status: UniFlow backend is safely using local JSON storage (server/tasks.json); no task data has been lost.')
        console.error('----------------------------------------------\n')
      }

      console.warn('[MongoDB] Preserving and using local JSON storage until connection succeeds.')
      return null
    } finally {
      connectionPromise = null
    }
  })()

  return connectionPromise
}

// Connection event listeners for clear error reporting and lifecycle tracking
mongoose.connection.on('error', (err) => {
  const sanitized = sanitizeSecrets(err.message)
  console.error(`[MongoDB] Runtime connection error: ${sanitized}`)
  if (sanitized.includes('SSL alert number 80')) {
    console.error('[MongoDB Diagnostics] Notice: Remote cluster sent SSL alert number 80 (handshake rejected due to Network Access IP restriction).')
  }
})

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from MongoDB')
})

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected to MongoDB database: uniflow')
})

export default mongoose

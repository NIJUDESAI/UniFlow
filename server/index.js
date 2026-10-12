import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { connectDB, getDbStatus } from './db.js'
import { seedTasksToMongoIfEmpty } from './storage/taskStorage.js'
import taskRoutes from './routes/tasks.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Securely load .env from the server directory
const envPath = path.resolve(__dirname, '.env')
dotenv.config({ path: envPath })
try {
  process.loadEnvFile(envPath)
} catch {
  // Loaded via dotenv or already present
}

const app = express()
const PORT = process.env.PORT || 5000

// Enable CORS for the React frontend (running on Vite at localhost:5173 or localhost:5174)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174']
}))

// Middleware to parse incoming JSON bodies
app.use(express.json())

// Health check endpoint reporting server and MongoDB connection status
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus()
  res.json({
    status: dbStatus.connected ? 'ok' : 'degraded',
    message: dbStatus.connected
      ? 'UniFlow backend server is running'
      : 'UniFlow backend server is running (fallback to JSON storage active)',
    timestamp: new Date().toISOString(),
    mongodb: dbStatus
  })
})

// Task API routes
app.use('/api/tasks', taskRoutes)

// Connect to MongoDB Atlas, seed initial tasks if needed, and start server
async function startServer() {
  await connectDB()
  await seedTasksToMongoIfEmpty()

  app.listen(PORT, () => {
    console.log(`UniFlow server is running on http://localhost:${PORT}`)
  })
}

startServer()

export default app

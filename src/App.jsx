import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  BriefcaseBusiness,
  Settings,
  Bell,
  Search,
  Clock,
  CheckCircle2,
  TrendingUp,
  GraduationCap,
  Menu,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  LogOut
} from 'lucide-react'
import { useAuth } from './context/AuthContext.jsx'
import AuthView from './components/AuthView.jsx'
import {
  fetchTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask, // eslint-disable-line no-unused-vars
  checkBackendHealth
} from './api/taskApi.js'
import './App.css'

/**
 * Extracts initials from the student's full name.
 * e.g., "Alex Johnson" -> "AJ", "Alex" -> "AL"
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ST'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Authenticated Student Dashboard.
 * Rendered when the student has an active verified session.
 */
function Dashboard() {
  const { user, token, logout } = useAuth()

  const [activePage, setActivePage] = useState('Dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'My Studies', icon: BookOpen },
    { name: 'Timetable', icon: CalendarDays },
    { name: 'Assignments', icon: ClipboardCheck },
    { name: 'Expenses', icon: Wallet },
    { name: 'Career', icon: BriefcaseBusiness }
  ]

  // Tasks are initialized as empty and sourced strictly from the backend
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState(null)
  const [submittingTask, setSubmittingTask] = useState(false)
  const [taskFormError, setTaskFormError] = useState(null)

  // Load tasks belonging to the authenticated student
  const loadTasks = async () => {
    if (!token) return

    setTasksLoading(true)
    setTasksError(null)

    try {
      const data = await fetchTasks(token)
      if (Array.isArray(data)) {
        setTasks(data)
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        logout()
        return
      }
      console.error('Failed to load tasks from backend:', error)
      setTasksError(error.message || 'Failed to load tasks from backend.')
    } finally {
      setTasksLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadTasks()
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Backend connection status checking
  const [backendStatus, setBackendStatus] = useState('checking') // 'checking' | 'connected' | 'disconnected'

  const checkBackendConnection = async () => {
    setBackendStatus('checking')
    try {
      await checkBackendHealth()
      setBackendStatus('connected')
    } catch (error) {
      console.warn('Backend connection check failed:', error)
      setBackendStatus('disconnected')
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkBackendConnection()
  }, [])

  // Modal and task form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubject, setTaskSubject] = useState('')
  const [taskTime, setTaskTime] = useState('')
  const [titleError, setTitleError] = useState('')

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.done).length
  const safeCompletedTasks = Math.min(completedTasks, totalTasks)
  const completionPercentage =
    totalTasks > 0 ? Math.min(100, Math.round((safeCompletedTasks / totalTasks) * 100)) : 0

  // Toggle task completion status
  const toggleTask = async (taskId) => {
    const currentTask = tasks.find((t) => t.id === taskId)
    if (!currentTask || !token) return

    const nextDone = !currentTask.done

    // Optimistic UI update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, done: nextDone } : task
      )
    )

    try {
      const updated = await apiUpdateTask(taskId, { done: nextDone }, token)
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, done: updated.done } : task
        )
      )
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        logout()
        return
      }
      console.error(`Failed to update task ${taskId}:`, error)
      // Revert optimistic update on failure
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, done: currentTask.done } : task
        )
      )
      setTasksError(`Failed to update task: ${error.message}`)
    }
  }

  const openModal = () => {
    setTaskTitle('')
    setTaskSubject('')
    setTaskTime('')
    setTitleError('')
    setTaskFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setTaskTitle('')
    setTaskSubject('')
    setTaskTime('')
    setTitleError('')
    setTaskFormError(null)
  }

  // Handle creating a new task
  const handleAddTask = async (e) => {
    e.preventDefault()

    const trimmedTitle = taskTitle.trim()
    if (!trimmedTitle) {
      setTitleError('Task title is required.')
      return
    }

    if (!token) {
      setTaskFormError('Authentication session expired. Please log in again.')
      return
    }

    setSubmittingTask(true)
    setTaskFormError(null)

    const payload = {
      title: trimmedTitle,
      subject: taskSubject.trim() || 'General',
      time: taskTime.trim() || 'Today',
      done: false
    }

    try {
      const newTask = await apiCreateTask(payload, token)
      setTasks((prevTasks) => [...prevTasks, newTask])
      closeModal()
      setTasksError(null)
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        closeModal()
        logout()
        return
      }
      console.error('Failed to create task:', error)
      setTaskFormError(error.message || 'Failed to save task to backend.')
    } finally {
      setSubmittingTask(false)
    }
  }

  // Close modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  const studentInitials = getInitials(user?.name)
  const studentFirstName = user?.name ? user.name.trim().split(' ')[0] : 'there'

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><GraduationCap size={25} /></div>
          <span>Uni<span className="brand-highlight">Flow</span></span>
          <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={21} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.name}
                className={`nav-item ${activePage === item.name ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(item.name)
                  setMenuOpen(false)
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                {item.name === 'Assignments' && <span className="nav-count">3</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><TrendingUp size={19} /></div>
            <h3>Stay on track!</h3>
            <p>Small steps today lead to big achievements tomorrow.</p>
          </div>
          <button className="nav-item settings-item" onClick={() => setActivePage('Settings')}>
            <Settings size={19} />
            <span>Settings</span>
          </button>

          {/* Authenticated Student Profile Card with Logout */}
          <div className="profile">
            <div className="avatar" title={user?.name || 'Student'}>
              {studentInitials}
            </div>
            <div className="profile-info">
              <strong>{user?.name || 'Student'}</strong>
              <span title={user?.email || ''}>{user?.email || 'Student account'}</span>
            </div>
            <button
              type="button"
              className="profile-logout-btn"
              onClick={logout}
              title="Log out of your workspace"
              aria-label="Log out"
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                color: '#9292a6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'color 0.15s, background 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#c53030'
                e.currentTarget.style.background = '#fff5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9292a6'
                e.currentTarget.style.background = 'none'
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input type="search" placeholder="Search anything..." />
              <kbd>⌘ K</kbd>
            </label>
            <button className="notification-button" aria-label="Notifications">
              <Bell size={19} />
              <span />
            </button>
            <div className="topbar-profile">
              <div className="top-avatar" title={user?.name || 'Student'}>
                {studentInitials}
              </div>
              <button
                type="button"
                className="topbar-logout-btn"
                onClick={logout}
                title="Log out of your workspace"
                aria-label="Log out"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">YOUR STUDENT WORKSPACE</p>
              <h1>
                {activePage === 'Dashboard'
                  ? `Good morning, ${studentFirstName}!`
                  : activePage}
              </h1>
              <p className="welcome-subtitle">
                {activePage === 'Dashboard'
                  ? "Ready to make today count? Here's your overview."
                  : `Welcome to your ${activePage.toLowerCase()} workspace.`}
              </p>
            </div>
            <div className="welcome-chips">
              <button
                type="button"
                className={`status-chip ${backendStatus}`}
                onClick={checkBackendConnection}
                title="Click to re-check backend connection"
                aria-label={`Backend connection status: ${
                  backendStatus === 'connected'
                    ? 'Backend Connected'
                    : backendStatus === 'disconnected'
                      ? 'Backend Disconnected'
                      : 'Checking connection...'
                }`}
              >
                <span className="status-dot" />
                <span>
                  {backendStatus === 'connected' && 'Backend Connected'}
                  {backendStatus === 'disconnected' && 'Backend Disconnected'}
                  {backendStatus === 'checking' && 'Checking connection...'}
                </span>
              </button>
              <div className="date-chip"><CalendarDays size={17} /> Your learning journey</div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-top"><span>Attendance</span><div className="stat-icon purple"><CalendarDays size={20} /></div></div>
              <div className="stat-value">87<span>%</span></div>
              <div className="stat-foot"><span className="positive"><TrendingUp size={14} /> On track</span><span>Target: 75%</span></div>
              <div className="progress-track"><div className="progress-fill purple-fill" style={{ width: '87%' }} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-top"><span>Tasks completed</span><div className="stat-icon green"><CheckCircle2 size={20} /></div></div>
              <div className="stat-value">{safeCompletedTasks}<span>/{totalTasks}</span></div>
              <div className="stat-foot"><span className="positive">Keep going!</span><span>{completionPercentage}% complete</span></div>
              <div className="progress-track"><div className="progress-fill green-fill" style={{ width: `${completionPercentage}%` }} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-top"><span>Study hours</span><div className="stat-icon orange"><Clock size={20} /></div></div>
              <div className="stat-value">24<span> hrs</span></div>
              <div className="stat-foot"><span>This week</span><span>Goal: 30 hrs</span></div>
              <div className="progress-track"><div className="progress-fill orange-fill" style={{ width: '80%' }} /></div>
            </div>

            <div className="stat-card">
              <div className="stat-top"><span>Monthly expenses</span><div className="stat-icon blue"><Wallet size={20} /></div></div>
              <div className="stat-value">₹2,450</div>
              <div className="stat-foot"><span>Budget remaining</span><span className="positive">₹1,550</span></div>
              <div className="progress-track"><div className="progress-fill blue-fill" style={{ width: '61%' }} /></div>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="panel tasks-panel">
              <div className="panel-heading">
                <div><h2>Today's tasks</h2><p>Keep your momentum going.</p></div>
                <button className="text-button" onClick={() => setActivePage('Assignments')}>View all <span>→</span></button>
              </div>

              {tasksError && (
                <div className="tasks-error-banner" role="alert">
                  <div className="tasks-error-text">
                    <AlertCircle size={15} />
                    <span>{tasksError}</span>
                  </div>
                  <button type="button" className="retry-tasks-btn" onClick={loadTasks}>
                    <RefreshCw size={11} /> Retry
                  </button>
                </div>
              )}

              {tasksLoading ? (
                <div className="tasks-status-message">
                  <Loader2 size={18} className="spin-icon" />
                  <span>Loading tasks...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className="tasks-empty-message">
                  <ClipboardCheck size={24} />
                  <p>No tasks scheduled for today. Add one below!</p>
                </div>
              ) : (
                <div className="task-list">
                  {tasks.map((task) => (
                    <div className="task-row" key={task.id}>
                      <button
                        type="button"
                        className={`task-check ${task.done ? 'task-done' : ''}`}
                        onClick={() => toggleTask(task.id)}
                        aria-label={`Mark "${task.title}" as ${task.done ? 'incomplete' : 'complete'}`}
                        role="checkbox"
                        aria-checked={task.done}
                      >
                        {task.done && <CheckCircle2 size={17} />}
                      </button>
                      <div className="task-details"><strong>{task.title}</strong><span>{task.subject}</span></div>
                      <span className="task-time"><Clock size={14} /> {task.time}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="add-task-button" onClick={openModal}>+ Add new task</button>
            </div>

            <div className="panel schedule-panel">
              <div className="panel-heading">
                <div><h2>Upcoming classes</h2><p>Your next sessions.</p></div>
                <button className="text-button" onClick={() => setActivePage('Timetable')}>Timetable <span>→</span></button>
              </div>
              <div className="class-list">
                <div className="class-row">
                  <div className="class-time">09:10<span>AM</span></div>
                  <div className="class-color purple-line" />
                  <div className="class-details"><strong>Data Structures</strong><span>Lecture · Room 204</span></div>
                  <span className="class-tag">DSA</span>
                </div>
                <div className="class-row">
                  <div className="class-time">11:10<span>AM</span></div>
                  <div className="class-color green-line" />
                  <div className="class-details"><strong>Database Systems</strong><span>Lecture · Room 108</span></div>
                  <span className="class-tag">DBMS</span>
                </div>
                <div className="class-row">
                  <div className="class-time">02:10<span>PM</span></div>
                  <div className="class-color orange-line" />
                  <div className="class-details"><strong>Web Development</strong><span>Practical · Lab 3</span></div>
                  <span className="class-tag">WDF</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel focus-panel">
              <div className="focus-icon"><BookOpen size={21} /></div>
              <div><h2>Make time for focused learning</h2><p>Set aside a little time today to move closer to your goals.</p></div>
              <button onClick={() => setActivePage('My Studies')}>Explore studies <span>→</span></button>
            </div>
            <div className="tip-card">
              <div className="tip-symbol">✦</div>
              <div><span>DAILY REMINDER</span><p>Consistency beats intensity. A little progress every day adds up.</p></div>
            </div>
          </section>

          <footer className="footer"><span>© 2026 UniFlow</span><span>Built for students, one step at a time.</span></footer>
        </div>
      </main>

      {/* Task Creation Modal */}
      {isModalOpen && (
        <div
          className="task-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
          role="presentation"
        >
          <div
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="task-modal-header">
              <div>
                <h2 id="modal-title">Add New Task</h2>
                <p>Create a task for today's schedule.</p>
              </div>
              <button
                type="button"
                className="task-modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="task-form">
              {taskFormError && (
                <div className="form-alert-error" role="alert">
                  <AlertCircle size={15} />
                  <span>{taskFormError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="task-title">
                  Task Title <span className="required">*</span>
                </label>
                <input
                  id="task-title"
                  type="text"
                  className={`form-input ${titleError ? 'input-error' : ''}`}
                  placeholder="e.g. Complete DSA practice"
                  value={taskTitle}
                  disabled={submittingTask}
                  onChange={(e) => {
                    setTaskTitle(e.target.value)
                    if (titleError) setTitleError('')
                    if (taskFormError) setTaskFormError(null)
                  }}
                  autoFocus
                />
                {titleError && <p className="form-error">{titleError}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="task-subject">Subject</label>
                <input
                  id="task-subject"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures"
                  value={taskSubject}
                  disabled={submittingTask}
                  onChange={(e) => setTaskSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-time">Due Time</label>
                <input
                  id="task-time"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 5:00 PM"
                  value={taskTime}
                  disabled={submittingTask}
                  onChange={(e) => setTaskTime(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeModal}
                  disabled={submittingTask}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submittingTask}
                >
                  {submittingTask ? (
                    <span className="btn-spinner">
                      <Loader2 size={15} className="spin-icon" /> Adding...
                    </span>
                  ) : (
                    'Add Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Root App component.
 * Manages screen routing between Loading, AuthView, and Authenticated Dashboard.
 */
function App() {
  const { isAuthenticated, isLoading } = useAuth()

  // Full-page loading screen while verifying stored session token
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          background: '#f7f8fc',
          color: '#7663e9',
          fontFamily: "'DM Sans', sans-serif"
        }}
      >
        <Loader2 size={36} className="spin-icon" />
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#4a4968' }}>
          Loading your workspace...
        </p>
      </div>
    )
  }

  // Display authentication view when unauthenticated
  if (!isAuthenticated) {
    return <AuthView />
  }

  // Render dashboard when authenticated
  return <Dashboard />
}

export default App

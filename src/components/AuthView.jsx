import { useState } from 'react'
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import './AuthView.css'

export function AuthView() {
  const { login, register } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle switching between 'login' and 'register' modes
  const handleSwitchMode = (targetMode) => {
    if (isSubmitting) return
    setMode(targetMode)
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
    setErrors({})
    setServerError('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  // Handle controlled input changes and clear field-specific errors
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (serverError) {
      setServerError('')
    }
  }

  // Client-side form validation
  const validateForm = () => {
    const newErrors = {}
    const emailRegex = /^\S+@\S+\.\S+$/

    if (mode === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Full name is required.'
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.'
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.'
    }

    if (mode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirm your password.'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    if (!validateForm() || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        await login(formData.email.trim(), formData.password)
      } else {
        await register(
          formData.name.trim(),
          formData.email.trim(),
          formData.password
        )
      }
    } catch (err) {
      setServerError(
        err.message || 'Authentication failed. Please check your credentials.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand Header */}
        <header className="auth-header">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <GraduationCap size={26} />
            </div>
            <span className="auth-brand-name">
              Uni<span className="auth-brand-highlight">Flow</span>
            </span>
          </div>
          <p className="auth-tagline">Your student life, flowing in one place.</p>
        </header>

        {/* Mode Toggle Tabs */}
        <div className="auth-tabs" role="tablist" aria-label="Authentication modes">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('login')}
            disabled={isSubmitting}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('register')}
            disabled={isSubmitting}
          >
            Create Account
          </button>
        </div>

        {/* Global Server Error Alert */}
        {serverError && (
          <div className="auth-alert-error" role="alert">
            <AlertCircle size={17} className="auth-alert-icon" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Full Name (Registration only) */}
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-name">
                Full Name <span className="auth-required">*</span>
              </label>
              <div className={`auth-input-wrapper ${errors.name ? 'input-error' : ''}`}>
                <User size={17} className="auth-input-icon" />
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="name"
                  autoFocus
                />
              </div>
              {errors.name && <p className="auth-field-error">{errors.name}</p>}
            </div>
          )}

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="auth-email">
              Student Email <span className="auth-required">*</span>
            </label>
            <div className={`auth-input-wrapper ${errors.email ? 'input-error' : ''}`}>
              <Mail size={17} className="auth-input-icon" />
              <input
                id="auth-email"
                name="email"
                type="email"
                placeholder="student@university.edu"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="email"
                autoFocus={mode === 'login'}
              />
            </div>
            {errors.email && <p className="auth-field-error">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="auth-password">
              Password <span className="auth-required">*</span>
            </label>
            <div className={`auth-input-wrapper ${errors.password ? 'input-error' : ''}`}>
              <Lock size={17} className="auth-input-icon" />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="auth-field-error">{errors.password}</p>}
          </div>

          {/* Confirm Password (Registration only) */}
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-confirm-password">
                Confirm Password <span className="auth-required">*</span>
              </label>
              <div className={`auth-input-wrapper ${errors.confirmPassword ? 'input-error' : ''}`}>
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="auth-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="auth-field-error">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="auth-btn-loading">
                <Loader2 size={18} className="auth-spin-icon" />
                <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
              </span>
            ) : (
              <span className="auth-btn-content">
                <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                <ArrowRight size={17} />
              </span>
            )}
          </button>
        </form>

        {/* Footer Mode Switch */}
        <footer className="auth-footer">
          {mode === 'login' ? (
            <p>
              New to UniFlow?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleSwitchMode('register')}
                disabled={isSubmitting}
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleSwitchMode('login')}
                disabled={isSubmitting}
              >
                Sign In
              </button>
            </p>
          )}
        </footer>
      </div>
    </div>
  )
}

export default AuthView


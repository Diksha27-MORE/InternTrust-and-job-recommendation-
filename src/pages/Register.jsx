import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'
import './Register.css'
import { registerUser } from '../utils/userSession'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match.')
      }

      const result = await registerUser(form)
      if (!result.success) {
        throw new Error(result.error)
      }

      navigate('/login')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">

      <div className="auth-brand">

        <div className="auth-logo">
          <span>Intern</span>Trust
        </div>

        <div className="auth-brand-content">

          <span className="auth-label">
            JOIN INTERNTRUST
          </span>

          <h1>
            Start applying
            <br />
            <span>with confidence.</span>
          </h1>

          <p>
            Create your account and start checking
            internships and job opportunities before
            you apply.
          </p>

        </div>

        <div className="auth-brand-footer">
          <span>🛡</span>
          Built to help students make safer career decisions.
        </div>

      </div>

      <div className="auth-form-container">

        <div className="register-form">

          <Link to="/" className="back-home">
            ← Back to home
          </Link>

          <div className="mobile-auth-logo">
            <span>Intern</span>Trust
          </div>

          <span className="auth-label">
            CREATE ACCOUNT
          </span>

          <h2>
            Get started
          </h2>

          <p className="auth-subtitle">
            Create your InternTrust account.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                Full name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label>
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <label>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Create a password"
              />
            </div>

            <div className="form-group">
              <label>
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
              />
            </div>

            {error && <p className="analyze-error">{error}</p>}

            <button
              type="submit"
              className="primary-btn auth-submit"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
              <span>→</span>
            </button>
          </form>

          <p className="register-switch">
            Already have an account?

            <Link to="/login">
              Sign in
            </Link>
          </p>

        </div>

      </div>

    </div>
  )
}

export default Register
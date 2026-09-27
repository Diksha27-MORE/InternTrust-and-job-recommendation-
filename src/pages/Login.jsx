import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cva } from 'class-variance-authority'
import './Login.css'
import {
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  AlertCircle,
  PartyPopper,
  Loader,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { loginUser } from '../utils/userSession'

async function loginRequest(email, password) {
  const result = await loginUser({ email, password })
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.user
}

/* --- confetti burst, fired on successful login --- */
const Confetti = forwardRef((props, ref) => {
  const instanceRef = useRef(null)
  const canvasRef = useCallback((node) => {
    if (node !== null) {
      if (instanceRef.current) return
      instanceRef.current = confetti.create(node, { resize: true, useWorker: true })
    } else if (instanceRef.current) {
      instanceRef.current.reset()
      instanceRef.current = null
    }
  }, [])
  const fire = useCallback((opts = {}) => instanceRef.current?.(opts), [])
  useImperativeHandle(ref, () => ({ fire }), [fire])
  return <canvas ref={canvasRef} {...props} />
})
Confetti.displayName = 'Confetti'

/* --- cycles through the loading-modal messages --- */
function TextLoop({ children, interval = 1.4, stopOnEnd = false }) {
  const [index, setIndex] = useState(0)
  const items = Array.isArray(children) ? children : [children]
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => {
        if (stopOnEnd && current === items.length - 1) {
          clearInterval(timer)
          return current
        }
        return (current + 1) % items.length
      })
    }, interval * 1000)
    return () => clearInterval(timer)
  }, [items.length, interval, stopOnEnd])
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={index}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {items[index]}
      </motion.div>
    </AnimatePresence>
  )
}

/* --- gentle blur/rise-in reveal used throughout the form --- */
function BlurFade({ children, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ y: 6, opacity: 0, filter: 'blur(6px)' }}
      animate={{ y: -6, opacity: 1, filter: 'blur(0px)' }}
      transition={{ delay: 0.04 + delay, duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* --- glass pill button used for OAuth + inline field actions --- */
const glassButtonVariants = cva('glass-button', {
  variants: {
    size: {
      default: 'glass-button--default',
      sm: 'glass-button--sm',
      icon: 'glass-button--icon',
    },
  },
  defaultVariants: { size: 'default' },
})

const GlassButton = forwardRef(
  ({ className = '', children, size, contentClassName = '', onClick, ...props }, ref) => {
    const handleWrapperClick = (e) => {
      const button = e.currentTarget.querySelector('button')
      if (button && e.target !== button) button.click()
    }
    return (
      <div className={`glass-button-wrap ${className}`} onClick={handleWrapperClick}>
        <button
          ref={ref}
          className={glassButtonVariants({ size })}
          onClick={onClick}
          {...props}
        >
          <span className={`glass-button-text ${contentClassName}`}>{children}</span>
        </button>
        <div className="glass-button-shadow" />
      </div>
    )
  }
)
GlassButton.displayName = 'GlassButton'

const GoogleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="oauth-icon">
    <g fillRule="evenodd" fill="none">
      <g fillRule="nonzero" transform="translate(3, 2)">
        <path fill="#4285F4" d="M57.8123233,30.1515267 C57.8123233,27.7263183 57.6155321,25.9565533 57.1896408,24.1212666 L29.4960833,24.1212666 L29.4960833,35.0674653 L45.7515771,35.0674653 C45.4239683,37.7877475 43.6542033,41.8844383 39.7213169,44.6372555 L39.6661883,45.0037254 L48.4223791,51.7870338 L49.0290201,51.8475849 C54.6004021,46.7020943 57.8123233,39.1313952 57.8123233,30.1515267" />
        <path fill="#34A853" d="M29.4960833,58.9921667 C37.4599129,58.9921667 44.1456164,56.3701671 49.0290201,51.8475849 L39.7213169,44.6372555 C37.2305867,46.3742596 33.887622,47.5868638 29.4960833,47.5868638 C21.6960582,47.5868638 15.0758763,42.4415991 12.7159637,35.3297782 L12.3700541,35.3591501 L3.26524241,42.4054492 L3.14617358,42.736447 C7.9965904,52.3717589 17.959737,58.9921667 29.4960833,58.9921667" />
        <path fill="#FBBC05" d="M12.7159637,35.3297782 C12.0932812,33.4944915 11.7329116,31.5279353 11.7329116,29.4960833 C11.7329116,27.4640054 12.0932812,25.4976752 12.6832029,23.6623884 L12.6667095,23.2715173 L3.44779955,16.1120237 L3.14617358,16.2554937 C1.14708246,20.2539019 0,24.7439491 0,29.4960833 C0,34.2482175 1.14708246,38.7380388 3.14617358,42.736447 L12.7159637,35.3297782" />
        <path fill="#EB4335" d="M29.4960833,11.4050769 C35.0347044,11.4050769 38.7707997,13.7975244 40.9011602,15.7968415 L49.2255853,7.66898166 C44.1130815,2.91684746 37.4599129,0 29.4960833,0 C17.959737,0 7.9965904,6.62018183 3.14617358,16.2554937 L12.6832029,23.6623884 C15.0758763,16.5505675 21.6960582,11.4050769 29.4960833,11.4050769" />
      </g>
    </g>
  </svg>
)

/* --- ambient blurred-blob background --- */
const GradientBackground = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 800 600"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
    className="auth-gradient-bg"
  >
    <defs>
      <linearGradient id="it_grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--blob-gold)" stopOpacity="0.85" />
        <stop offset="100%" stopColor="var(--blob-amber)" stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id="it_grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--blob-purple)" stopOpacity="0.9" />
        <stop offset="50%" stopColor="var(--blob-violet)" stopOpacity="0.7" />
        <stop offset="100%" stopColor="var(--blob-indigo)" stopOpacity="0.5" />
      </linearGradient>
      <radialGradient id="it_grad3" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="var(--blob-red)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--blob-crimson)" stopOpacity="0.35" />
      </radialGradient>
      <filter id="it_blur1" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="35" />
      </filter>
      <filter id="it_blur2" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="25" />
      </filter>
      <filter id="it_blur3" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="45" />
      </filter>
    </defs>
    <g className="auth-blob-float-1">
      <ellipse cx="200" cy="500" rx="250" ry="180" fill="url(#it_grad1)" filter="url(#it_blur1)" transform="rotate(-30 200 500)" />
      <rect x="500" y="100" width="300" height="250" rx="80" fill="url(#it_grad2)" filter="url(#it_blur2)" transform="rotate(15 650 225)" />
    </g>
    <g className="auth-blob-float-2">
      <circle cx="650" cy="450" r="150" fill="url(#it_grad3)" filter="url(#it_blur3)" opacity="0.7" />
      <ellipse cx="50" cy="150" rx="180" ry="120" fill="var(--blob-amber)" filter="url(#it_blur2)" opacity="0.7" />
    </g>
  </svg>
)

const loadingSteps = [
  { message: 'Verifying your details...' },
  { message: 'Signing you in...' },
]
const LOOP_INTERVAL = 1.3

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [authStep, setAuthStep] = useState('email') // 'email' | 'password'
  const [modalStatus, setModalStatus] = useState('closed') // closed | loading | error | success
  const [modalErrorMessage, setModalErrorMessage] = useState('')

  const confettiRef = useRef(null)
  const passwordInputRef = useRef(null)

  const isEmailValid = /\S+@\S+\.\S+/.test(email)
  const isPasswordValid = password.length >= 6

  const fireConfetti = () => {
    const fire = confettiRef.current?.fire
    if (!fire) return
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 }
    fire({ ...defaults, particleCount: 50, origin: { x: 0, y: 1 }, angle: 60 })
    fire({ ...defaults, particleCount: 50, origin: { x: 1, y: 1 }, angle: 120 })
  }

  const handleProgressStep = () => {
    if (authStep === 'email' && isEmailValid) setAuthStep('password')
  }

  const handleGoBack = () => {
    if (authStep === 'password') setAuthStep('email')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && authStep === 'email') {
      e.preventDefault()
      handleProgressStep()
    }
  }

  const closeModal = () => {
    setModalStatus('closed')
    setModalErrorMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (modalStatus !== 'closed' || authStep !== 'password' || !isPasswordValid) return

    setModalStatus('loading')
    try {
      await loginRequest(email, password)
      fireConfetti()
      navigate('/dashboard')
    } catch (err) {
      setModalErrorMessage(err?.message || 'Something went wrong. Please try again.')
      setModalStatus('error')
    }
  }

  useEffect(() => {
    if (authStep === 'password') {
      const t = setTimeout(() => passwordInputRef.current?.focus(), 450)
      return () => clearTimeout(t)
    }
  }, [authStep])

  const modal = (
    <AnimatePresence>
      {modalStatus !== 'closed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="auth-modal-backdrop"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="auth-modal"
          >
            {(modalStatus === 'error' || modalStatus === 'success') && (
              <button onClick={closeModal} className="auth-modal-close" aria-label="Close">
                <X size={18} />
              </button>
            )}

            {modalStatus === 'error' && (
              <>
                <AlertCircle className="auth-modal-icon auth-modal-icon--error" />
                <p className="auth-modal-message">{modalErrorMessage}</p>
                <GlassButton onClick={closeModal} size="sm">
                  Try again
                </GlassButton>
              </>
            )}

            {modalStatus === 'loading' && (
              <TextLoop interval={LOOP_INTERVAL}>
                {loadingSteps.map((step, i) => (
                  <div key={i} className="auth-modal-step">
                    <Loader className="auth-modal-icon auth-modal-icon--spin" />
                    <p className="auth-modal-message">{step.message}</p>
                  </div>
                ))}
              </TextLoop>
            )}

            {modalStatus === 'success' && (
              <div className="auth-modal-step">
                <PartyPopper className="auth-modal-icon auth-modal-icon--success" />
                <p className="auth-modal-message">Welcome back!</p>
                <GlassButton
                  onClick={() => navigate('/dashboard')}
                  size="sm"
                  className="auth-modal-continue"
                >
                  Continue
                </GlassButton>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className="auth-page">
      <Confetti ref={confettiRef} className="auth-confetti" />
      {modal}

      <Link to="/" className="auth-back-home">
        ← Back to home
      </Link>

      <div className="auth-topbar">
        <div className="auth-logo-mark">
          <span>Intern</span>Trust
        </div>
      </div>

      <div className="auth-stage">
        <div className="auth-gradient-wrap">
          <GradientBackground />
        </div>

        <fieldset disabled={modalStatus !== 'closed'} className="auth-fieldset">
          <AnimatePresence mode="wait">
            {authStep === 'email' && (
              <motion.div
                key="email-content"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="auth-step-header"
              >
                <BlurFade delay={0.25}>
                  <h1 className="auth-heading">Welcome back</h1>
                </BlurFade>
                <BlurFade delay={0.5}>
                  <p className="auth-subtext">
                    Sign in to continue protecting your career opportunities with InternTrust.
                  </p>
                </BlurFade>
                <BlurFade delay={0.75}>
                  <p className="auth-label-small">Continue with</p>
                </BlurFade>
                <BlurFade delay={1}>
                  <div className="auth-oauth-row">
                    <GlassButton
                      type="button"
                      size="sm"
                      contentClassName="auth-oauth-btn"
                      onClick={() => console.warn('TODO: wire up Google OAuth')}
                    >
                      <GoogleIcon /> Google
                    </GlassButton>
                  </div>
                </BlurFade>
                <BlurFade delay={1.25}>
                  <div className="auth-divider">
                    <hr />
                    <span>OR</span>
                    <hr />
                  </div>
                </BlurFade>
              </motion.div>
            )}

            {authStep === 'password' && (
              <motion.div
                key="password-content"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="auth-step-header"
              >
                <BlurFade>
                  <h1 className="auth-heading auth-heading--sm">Enter your password</h1>
                </BlurFade>
                <BlurFade delay={0.25}>
                  <p className="auth-subtext">Welcome back. Enter your password to sign in.</p>
                </BlurFade>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="auth-form">
            <AnimatePresence>
              {authStep === 'email' && (
                <motion.div
                  key="email-field"
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="auth-field-group"
                >
                  <BlurFade delay={1.5}>
                    <div className="glass-input-wrap">
                      <div className="glass-input">
                        <div className="glass-input-icon">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="glass-input-field"
                          autoComplete="email"
                        />
                        <div
                          className={`glass-input-action ${isEmailValid ? 'is-visible' : ''}`}
                        >
                          <GlassButton
                            type="button"
                            onClick={handleProgressStep}
                            size="icon"
                            aria-label="Continue with email"
                          >
                            <ArrowRight size={18} />
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  </BlurFade>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {authStep === 'password' && (
                <BlurFade key="password-field" className="auth-field-group">
                  <div className="auth-field-label-row">
                    <label className="auth-field-label">Email</label>
                  </div>
                  <div className="glass-input-wrap glass-input-wrap--static">
                    <div className="glass-input">
                      <div className="glass-input-icon">
                        <Mail size={18} />
                      </div>
                      <span className="glass-input-field glass-input-field--readonly">
                        {email}
                      </span>
                    </div>
                  </div>

                  <div className="auth-field-label-row">
                    <label className="auth-field-label">Password</label>
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => console.warn('TODO: wire up forgot-password flow')}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="glass-input-wrap">
                    <div className="glass-input">
                      <div className="glass-input-icon">
                        {isPasswordValid ? (
                          <button
                            type="button"
                            aria-label="Toggle password visibility"
                            onClick={() => setShowPassword((v) => !v)}
                            className="glass-input-icon-btn"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        ) : (
                          <Lock size={18} />
                        )}
                      </div>
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-input-field"
                        autoComplete="current-password"
                      />
                      <div
                        className={`glass-input-action ${isPasswordValid ? 'is-visible' : ''}`}
                      >
                        <GlassButton type="submit" size="icon" aria-label="Login">
                          <ArrowRight size={18} />
                        </GlassButton>
                      </div>
                    </div>
                  </div>

                  <label className="auth-remember-row">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  <BlurFade delay={0.2}>
                    <button type="button" onClick={handleGoBack} className="auth-go-back">
                      <ArrowLeft size={16} /> Go back
                    </button>
                  </BlurFade>
                </BlurFade>
              )}
            </AnimatePresence>
          </form>

          <p className="auth-switch">
            Don't have an account?
            <Link to="/register">
              Create one
            </Link>
          </p>

        </fieldset>
      </div>
    </div>
  )
}

export default Login
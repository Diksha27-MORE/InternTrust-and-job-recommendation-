import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Send,
  Bot,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { getAuthToken, getCurrentUser } from '../utils/userSession'
import './Analyze.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

function buildAnalysisPayload(form) {
  const currentUser = getCurrentUser()
  const opportunityUrl = form.url.trim()

  let hostname = 'company'
  let title = 'Job Opportunity'

  try {
    const parsedUrl = new URL(opportunityUrl)

    hostname = parsedUrl.hostname.replace(/^www\./i, '')

    const lastSegment = parsedUrl.pathname
      .split('/')
      .filter(Boolean)
      .pop()

    if (lastSegment) {
      title = lastSegment
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    }
  } catch {
    // Backend handles URL validation.
  }

  return {
    title,
    description: form.message.trim(),
    message: form.message.trim(),
    email: form.email.trim(),
    website_link: form.websiteLink.trim(),
    website: form.websiteLink.trim() || opportunityUrl,
    url: opportunityUrl,
    company_name: hostname.split('.')[0] || 'Company',
    user: currentUser?.name || 'anonymous_user',
    skills: Array.isArray(currentUser?.skills)
      ? currentUser.skills
      : [],
  }
}

function Analyze() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    websiteLink: '',
    email: '',
    message: '',
    url: '',
  })

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // =====================================================
  // CHATBOT STATE
  // =====================================================

  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: "Hey! Once you run an analysis, I can walk you through why it got the score it did, in plain terms. Just ask.",
    },
  ])

  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // =====================================================
  // AUTH CHECK
  // =====================================================

  useEffect(() => {
    if (!getCurrentUser()) {
      navigate('/login')
    }
  }, [navigate])

  // =====================================================
  // INPUT UPDATE
  // =====================================================

  const updateField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  // =====================================================
  // ML ANALYSIS
  // =====================================================

  const handleAnalyze = async () => {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      setError('Please log in before analyzing an opportunity.')
      return
    }

    if (
      Object.values(form).some(
        (value) => !value.trim()
      )
    ) {
      setError(
        'Please complete all opportunity details before analyzing.'
      )
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    // Reset chatbot for the new analysis
    setChatMessages([
      {
        role: 'assistant',
        text: "Okay, I've got the result! Ask me why it scored the way it did, or what to do next, and I'll break it down for you.",
      },
    ])

    setChatInput('')

    try {
      const payload = buildAnalysisPayload(form)

      const response = await fetch(
        `${API_BASE_URL}/analyze`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },

          body: JSON.stringify(payload),
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error || 'Analysis failed.'
        )
      }

      setResult(data)
    } catch (requestError) {
      console.error(
        'Analysis error:',
        requestError
      )

      setError(
        requestError.message ||
          'Unable to connect to the backend.'
      )
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // AI CHATBOT
  // =====================================================

  const handleChat = async () => {
    const question = chatInput.trim()

    if (
      !question ||
      !result ||
      chatLoading
    ) {
      return
    }

    const analysis = result.data || result

    setChatMessages((previous) => [
      ...previous,
      {
        role: 'user',
        text: question,
      },
    ])

    setChatInput('')
    setChatLoading(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chatbot`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },

          body: JSON.stringify({
            question,
            analysis,
          }),
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Chatbot request failed.'
        )
      }

      setChatMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text:
            data.answer ||
            'I could not generate an answer.',
        },
      ])
    } catch (chatError) {
      console.error(
        'Chatbot error:',
        chatError
      )

      // Network-level failure (server unreachable, CORS, offline) vs.
      // a real error message the backend sent back — show whichever
      // actually applies instead of one generic line for everything.
      const isNetworkFailure =
        chatError instanceof TypeError

      setChatMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: isNetworkFailure
            ? "Sorry, I couldn't reach the server. Make sure the backend is running and try again."
            : `Sorry, something went wrong: ${chatError.message}`,
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="analyze-page">
      <Sidebar activePage="analyze" />

      <main className="analyze-main">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="analyze-header">
          <span className="dashboard-label">
            OPPORTUNITY CHECK
          </span>

          <h1>
            Analyze an opportunity
          </h1>

          <p>
            Check a job or internship before you apply.
          </p>
        </header>


        {/* =================================================
            MAIN ANALYZE BOX
        ================================================= */}

        <section className="analyze-box">

          <div className="analyze-icon">
            <ShieldCheck
              size={28}
              strokeWidth={1.75}
            />
          </div>

          <span className="analyze-step">
            STEP 01
          </span>

          <h2>
            Submit opportunity details
          </h2>

          <p>
            Our trained ML model checks the details
            for suspicious or potentially fraudulent activity.
          </p>


          {/* =================================================
              FORM
          ================================================= */}

          <div className="analyze-input-area">

            <div className="analyze-form-grid">

              <label>
                WEBSITE LINK

                <input
                  type="url"
                  value={form.websiteLink}
                  onChange={updateField(
                    'websiteLink'
                  )}
                  placeholder="https://company.com"
                />
              </label>


              <label>
                EMAIL

                <input
                  type="email"
                  value={form.email}
                  onChange={updateField(
                    'email'
                  )}
                  placeholder="recruiter@company.com"
                />
              </label>


              <label className="analyze-form-wide">
                MESSAGE

                <textarea
                  value={form.message}
                  onChange={updateField(
                    'message'
                  )}
                  placeholder="Paste the recruitment message or job description"
                  rows={5}
                />
              </label>


              <label>
                URL

                <input
                  type="url"
                  value={form.url}
                  onChange={updateField(
                    'url'
                  )}
                  placeholder="https://example.com/job/internship"
                />
              </label>

            </div>


            <button
              type="button"
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                'Analyzing with ML model...'
              ) : (
                <>
                  Analyze
                  <ArrowRight
                    size={15}
                    strokeWidth={2.5}
                  />
                </>
              )}
            </button>


            {error && (
              <p className="analyze-error">
                {error}
              </p>
            )}

          </div>


          {/* =================================================
              INFO CHECKS
          ================================================= */}

          <div className="analyze-info">

            <div>
              <CheckCircle2 size={14} />
              Company information
            </div>

            <div>
              <CheckCircle2 size={14} />
              Job details
            </div>

            <div>
              <CheckCircle2 size={14} />
              Risk indicators
            </div>

          </div>


          {/* =================================================
              ANALYSIS RESULT
          ================================================= */}

          {result &&
            (() => {
              const analysis =
                result.data || result

              const score = Math.round(
                analysis.risk_score ??
                  analysis.final_risk_score ??
                  0
              )

              const level = (
                analysis.risk_level ||
                'Unknown'
              ).toLowerCase()

              const levelMeta = {
                low: {
                  label: 'LOW RISK',
                  emoji: '🟢',
                  color: 'var(--an-success)',
                  trust:
                    'This internship appears TRUSTWORTHY.',
                },

                medium: {
                  label: 'MEDIUM RISK',
                  emoji: '🟡',
                  color: 'var(--an-warning)',
                  trust:
                    'This internship needs CLOSER VERIFICATION.',
                },

                high: {
                  label: 'HIGH RISK',
                  emoji: '🔴',
                  color: 'var(--an-danger)',
                  trust:
                    'This internship is NOT TRUSTWORTHY.',
                },
              }[level] || {
                label: 'UNKNOWN',
                emoji: '⚪',
                color: 'var(--an-muted)',
                trust:
                  'We could not determine a clear verdict.',
              }

              const radius = 52

              const circumference =
                2 * Math.PI * radius

              const offset =
                circumference *
                (
                  1 -
                  Math.min(
                    Math.max(score, 0),
                    100
                  ) /
                    100
                )

              return (
                <>
                  <div className="analysis-result risk-result">

                    <span className="analysis-result-label">
                      RISK ANALYSIS RESULT
                    </span>


                    <div className="risk-result-top">

                      <div className="risk-ring-wrap">

                        <svg
                          viewBox="0 0 120 120"
                          className="risk-ring"
                        >

                          <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            className="risk-ring-track"
                            fill="none"
                            strokeWidth="10"
                          />

                          <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke={
                              levelMeta.color
                            }
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={
                              circumference
                            }
                            strokeDashoffset={
                              offset
                            }
                            transform="rotate(-90 60 60)"
                            className="risk-ring-progress"
                          />

                        </svg>


                        <div className="risk-ring-center">

                          <span className="risk-ring-score">
                            {score}
                          </span>

                          <span className="risk-ring-outof">
                            / 100
                          </span>

                        </div>

                      </div>


                      <div className="risk-summary">

                        <span
                          className="risk-badge"
                          style={{
                            color:
                              levelMeta.color,
                            borderColor:
                              levelMeta.color,
                          }}
                        >
                          {levelMeta.emoji}{' '}
                          {levelMeta.label}
                        </span>

                        <h3>
                          {levelMeta.trust}
                        </h3>

                        <p className="risk-confidence">
                          Model confidence:{' '}
                          <strong>
                            {analysis.confidence ??
                              '—'}
                            %
                          </strong>
                        </p>


                        {analysis.recommendation && (
                          <p
                            className="risk-recommendation"
                            style={{
                              borderColor:
                                levelMeta.color,
                            }}
                          >
                            {
                              analysis.recommendation
                            }
                          </p>
                        )}

                      </div>

                    </div>


                    {Array.isArray(
                      analysis.reasons
                    ) &&
                      analysis.reasons.length >
                        0 && (
                        <div className="risk-reasons">

                          <span className="risk-reasons-label">
                            DETECTED INDICATORS
                          </span>

                          <ul>
                            {analysis.reasons.map(
                              (
                                reason,
                                idx
                              ) => (
                                <li
                                  key={idx}
                                >
                                  {reason}
                                </li>
                              )
                            )}
                          </ul>

                        </div>
                      )}

                  </div>


                  {/* =================================================
                      AI CHATBOT
                  ================================================= */}

                  <section className="interntrust-chatbot">

                    <div className="chatbot-header">

                      <div className="chatbot-icon">
                        <Bot
                          size={20}
                          strokeWidth={2}
                        />
                      </div>

                      <div>
                        <h3>
                          InternTrust AI Assistant
                        </h3>

                        <p>
                          Ask questions about your verification result
                        </p>
                      </div>

                    </div>


                    <div className="chatbot-messages">

                      {chatMessages.map(
                        (
                          message,
                          index
                        ) => (
                          <div
                            key={index}
                            className={`chat-message ${message.role}`}
                          >
                            {message.text}
                          </div>
                        )
                      )}


                      {chatLoading && (
                        <div className="chat-message assistant">
                          Thinking...
                        </div>
                      )}

                    </div>


                    <div className="chatbot-input">

                      <input
                        type="text"
                        value={chatInput}
                        onChange={(event) =>
                          setChatInput(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                            'Enter'
                          ) {
                            handleChat()
                          }
                        }}
                        placeholder="Ask why this opportunity was flagged..."
                      />

                      <button
                        type="button"
                        onClick={handleChat}
                        disabled={
                          chatLoading ||
                          !chatInput.trim()
                        }
                        aria-label="Send message"
                      >
                        <Send size={18} />
                      </button>

                    </div>

                  </section>
                </>
              )
            })()}

        </section>


        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section className="analyze-how">

          <div className="section-top">

            <span className="dashboard-label">
              HOW IT WORKS
            </span>

            <h2>
              Three checks. One clear result.
            </h2>

          </div>


          <div className="analyze-steps">

            <div className="analyze-step-card">
              <span>01</span>

              <h3>
                Submit
              </h3>

              <p>
                Enter the job or internship details.
              </p>
            </div>


            <div className="analyze-step-card">
              <span>02</span>

              <h3>
                Analyze
              </h3>

              <p>
                InternTrust sends them to the trained model.
              </p>
            </div>


            <div className="analyze-step-card">
              <span>03</span>

              <h3>
                Decide
              </h3>

              <p>
                Get a clear Safe or Suspicious result.
              </p>
            </div>

          </div>

        </section>

      </main>
    </div>
  )
}

export default Analyze
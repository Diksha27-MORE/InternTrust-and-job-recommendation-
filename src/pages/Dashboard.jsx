import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import {
  ShieldCheck,
  ListChecks,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import './Dashboard.css'
import {
  getCurrentUser,
  getAuthToken,
  getTargetRole,
  getUserSkills,
  updateCurrentUser,
  PROFILE_UPDATED_EVENT,
} from '../utils/userSession'

/* =========================================================
   LOCATION OPTIONS
   The chosen city is saved to the profile and sent to the
   existing /api/recommend endpoint as `location`.
========================================================= */

const LOCATION_OPTIONS = [
  { value: 'Worldwide', label: 'Worldwide / Remote' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Ahmedabad', label: 'Ahmedabad' },
  { value: 'Kolkata', label: 'Kolkata' },
  { value: 'India', label: 'Anywhere in India' },
]

// Nothing saved yet -> show worldwide results, filter nothing.
const DEFAULT_LOCATION = 'Worldwide'

const locationSelectStyle = {
  padding: '8px 12px',
  borderRadius: '10px',
  border: '1px solid #dde1ea',
  background: '#ffffff',
  color: '#0f1222',
  fontSize: '12.5px',
  fontFamily: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
}

const locationLabelStyle = {
  display: 'block',
  marginBottom: '5px',
  color: '#98a2b3',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
}

/* =========================================================
   API BASE
   Tries the dev-server proxy first (same origin, which is
   what login/register already use). If that fails because
   no proxy is configured, it falls back to the Flask port.
========================================================= */

const FALLBACK_API_BASE = 'http://localhost:5000'

let resolvedBase = null

async function apiFetch(path, options = {}) {
  const bases =
    resolvedBase !== null
      ? [resolvedBase]
      : ['', FALLBACK_API_BASE]

  let lastError = null

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, options)

      resolvedBase = base

      return response
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Network request failed.')
}

async function readJson(response) {
  if (!response) {
    return null
  }

  return response.json().catch(() => null)
}

/* =========================================================
   HELPERS
========================================================= */

function riskClass(level) {
  const value = String(level || '').toLowerCase()

  if (value === 'low') {
    return 'safe'
  }

  if (value === 'medium') {
    return 'warning'
  }

  if (value === 'high') {
    return 'danger'
  }

  return 'warning'
}

function Dashboard() {
  const navigate = useNavigate()

  const [currentUser, setCurrentUserState] = useState(() =>
    getCurrentUser()
  )

  const [userHistory, setUserHistory] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [skillGap, setSkillGap] = useState(null)

  const [loading, setLoading] = useState(true)
  const [careerLoading, setCareerLoading] = useState(false)
  const [error, setError] = useState('')

  /* =======================================================
     PROFILE-DRIVEN INPUTS
     ROOT FIX: these come from what Profile saved.
     `user.role` (Student / Graduate) is the account type
     and is never used as a target role.
  ======================================================= */

  const targetRole = getTargetRole(currentUser)

  const userSkills = getUserSkills(currentUser)

  const selectedLocation =
    String(currentUser?.location || '').trim() ||
    DEFAULT_LOCATION

  const isCitySelected =
    selectedLocation.toLowerCase() !== 'worldwide'

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard = useCallback(async () => {
    const user = getCurrentUser()

    const token = getAuthToken()

    if (!user || !token) {
      navigate('/login')
      return
    }

    setCurrentUserState(user)

    const role = getTargetRole(user)

    const skills = getUserSkills(user)

    // "Worldwide" means: do not filter by city
    const location =
      String(user.location || '').trim() || DEFAULT_LOCATION

    setLoading(true)
    setError('')

    if (role) {
      setCareerLoading(true)
    } else {
      setCareerLoading(false)
      setRecommendations([])
      setSkillGap(null)
    }

    /* ---------------- HISTORY ---------------- */

    try {
      const historyResponse = await apiFetch(
        '/api/auth/history',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (historyResponse.ok) {
        const historyData = await readJson(historyResponse)

        setUserHistory(
          Array.isArray(historyData?.history)
            ? historyData.history
            : []
        )
      } else if (historyResponse.status === 401) {
        navigate('/login')
        return
      } else {
        setUserHistory([])
      }
    } catch (err) {
      console.error('History error:', err)

      setUserHistory(
        Array.isArray(user.history) ? user.history : []
      )

      setError('Unable to reach the InternTrust server.')
    } finally {
      setLoading(false)
    }

    /* ---------------- CAREER DATA ---------------- */

    if (!role) {
      return
    }

    const payload = {
      target_role: role,
      skills,
      location,
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    try {
      const [jobsResponse, gapResponse] = await Promise.all([
        apiFetch('/api/recommend', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        }),
        apiFetch('/api/skill-gap', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            target_role: role,
            skills,
          }),
        }),
      ])

      const jobsData = await readJson(jobsResponse)

      if (jobsResponse.ok && jobsData?.success) {
        setRecommendations(
          Array.isArray(jobsData.jobs) ? jobsData.jobs : []
        )
      } else {
        setRecommendations([])

        if (jobsData?.error && !jobsData?.needs_target_role) {
          setError(jobsData.error)
        }
      }

      const gapData = await readJson(gapResponse)

      if (gapResponse.ok && gapData?.success) {
        setSkillGap(gapData.data || null)
      } else {
        setSkillGap(null)
      }
    } catch (err) {
      console.error('Career data error:', err)

      setError(
        'Unable to load job recommendations right now.'
      )
    } finally {
      setCareerLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  /* =======================================================
     REFRESH WHEN THE PROFILE CHANGES
  ======================================================= */

  useEffect(() => {
    const handleProfileUpdate = () => {
      loadDashboard()
    }

    window.addEventListener(
      PROFILE_UPDATED_EVENT,
      handleProfileUpdate
    )

    window.addEventListener('focus', handleProfileUpdate)

    return () => {
      window.removeEventListener(
        PROFILE_UPDATED_EVENT,
        handleProfileUpdate
      )

      window.removeEventListener('focus', handleProfileUpdate)
    }
  }, [loadDashboard])

  /* =======================================================
     LOCATION CHANGE
     Saves to the profile, which fires PROFILE_UPDATED_EVENT
     and reloads the recommendations for the new city.
  ======================================================= */

  const handleLocationChange = (event) => {
    const value = event.target.value

    const updated = updateCurrentUser({ location: value })

    if (updated) {
      setCurrentUserState(updated)
    }
  }


  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const displayName =
    currentUser?.name ||
    currentUser?.email?.split('@')[0] ||
    'Student'

  const accountType = currentUser?.role || 'Student'

  const totalChecks = userHistory.length

  const safeChecks = userHistory.filter(
    (item) =>
      String(item.riskLevel || '').toLowerCase() === 'low'
  ).length

  const riskChecks = Math.max(totalChecks - safeChecks, 0)

  const recentChecks = userHistory.slice(0, 5)

  const missingSkills = skillGap?.missing_skills || []

  const matchedSkills = skillGap?.matched_skills || []

  const skillMatchPercentage =
    skillGap?.skill_match_percentage ?? 0

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="dashboard-page">

      <Sidebar activePage="dashboard" />

      <main className="dashboard-main">

        {/* =============== HEADER =============== */}

        <section className="dashboard-header">

          <div>

            <div className="dashboard-label">
              DASHBOARD
            </div>

            <h1>
              Hello {displayName} 👋
            </h1>

            <p>
              {targetRole
                ? `Tracking opportunities for ${targetRole}.`
                : 'Check an opportunity before you apply.'}
            </p>

          </div>

          <div className="dashboard-user">

            <div className="user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>{accountType}</span>
            </div>

          </div>

        </section>


        {/* =============== QUICK CHECK =============== */}

        <section className="analyze-card">

          <div className="analyze-card-content">

            <div className="dashboard-label dashboard-label--onbrand">
              QUICK CHECK
            </div>

            <h2>
              Is this internship safe?
            </h2>

            <p>
              Paste a job or internship URL and InternTrust
              will analyze it for potential risks.
            </p>

            <Link
              to="/analyze"
              className="primary-btn"
            >
              Analyze
              <ArrowRight size={17} />
            </Link>

          </div>

          <div className="analyze-decoration">
            <div className="shield-glow">
              <ShieldCheck
                className="shield-icon"
                size={52}
              />
            </div>
          </div>

        </section>


        {/* =============== ERROR =============== */}

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}


        {/* =============== STATS =============== */}

        <section className="dashboard-stats">

          <div className="dashboard-stat-card">

            <div className="stat-top">
              <span>Total checks</span>

              <span className="stat-icon stat-icon--neutral">
                <ListChecks size={16} />
              </span>
            </div>

            <strong>
              {loading ? '—' : totalChecks}
            </strong>

            <small>Opportunities analyzed</small>

          </div>


          <div className="dashboard-stat-card">

            <div className="stat-top">
              <span>Safe opportunities</span>

              <span className="stat-icon stat-icon--safe">
                <ShieldCheck size={16} />
              </span>
            </div>

            <strong className="safe-number">
              {loading ? '—' : safeChecks}
            </strong>

            <small>Low-risk results</small>

          </div>


          <div className="dashboard-stat-card">

            <div className="stat-top">
              <span>Potential risks</span>

              <span className="stat-icon stat-icon--warning">
                <AlertTriangle size={16} />
              </span>
            </div>

            <strong className="warning-number">
              {loading ? '—' : riskChecks}
            </strong>

            <small>Need your attention</small>

          </div>

        </section>


        {/* =============== RECENT CHECKS =============== */}

        <section className="recent-section">

          <div className="section-top">

            <div>
              <div className="dashboard-label">
                ACTIVITY
              </div>

              <h2>Recent checks</h2>
            </div>

            <Link
              to="/history"
              className="view-all-link"
            >
              View history
              <ArrowUpRight size={15} />
            </Link>

          </div>


          <div className="recent-table">

            <div className="recent-row header-row">
              <span>Opportunity</span>
              <span>Date</span>
              <span>Risk score</span>
              <span>Status</span>
            </div>

            {recentChecks.length === 0 ? (

              <div className="dashboard-empty">
                <strong>No checks yet</strong>

                <p>
                  Your analyzed opportunities will appear here.
                </p>
              </div>

            ) : (

              recentChecks.map((item, index) => {

                const score =
                  item.finalRiskScore ??
                  item.riskScore ??
                  0

                const level = item.riskLevel || 'Unknown'

                return (
                  <div
                    className="recent-row"
                    key={item.id || index}
                  >

                    <span className="opportunity-cell">
                      {item.title ||
                        item.company ||
                        'Job Opportunity'}
                    </span>

                    <span className="muted-cell">
                      {item.createdAt
                        ? new Date(
                            item.createdAt
                          ).toLocaleDateString()
                        : '—'}
                    </span>

                    <span className="score-cell">
                      {score}
                    </span>

                    <span
                      className={`status ${riskClass(level)}`}
                    >
                      <span className="status-dot"></span>
                      {level}
                    </span>

                  </div>
                )
              })

            )}

          </div>

        </section>


        {/* =============== RECOMMENDATIONS + SKILL GAP =============== */}

        <div className="dashboard-lower-grid">

          {/* ---------- JOB RECOMMENDATIONS ---------- */}

          <section className="dashboard-section">

            <div className="dashboard-section-header">

              <div>
                <div className="dashboard-label">
                  CAREER MATCH
                </div>

                <h2>Job Recommendations</h2>

                <p>
                  {targetRole
                    ? `Live roles matched to ${targetRole}${
                        userSkills.length
                          ? ` and ${userSkills.length} saved skill${
                              userSkills.length > 1 ? 's' : ''
                            }`
                          : ''
                      }${
                        isCitySelected
                          ? ` — ${selectedLocation} only`
                          : ''
                      }.`
                    : 'Add a target role in your profile to get personalized recommendations.'}
                </p>
              </div>

              <div>
                <label
                  style={locationLabelStyle}
                  htmlFor="job-location"
                >
                  Location
                </label>

                <select
                  id="job-location"
                  style={locationSelectStyle}
                  value={selectedLocation}
                  onChange={handleLocationChange}
                >
                  {LOCATION_OPTIONS.map((option) => (
                    <option
                      key={option.value || 'anywhere'}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>


            {!targetRole ? (

              <div className="dashboard-empty">
                <strong>Target role is required</strong>

                <p>
                  Open your profile, set the role you want to
                  pursue (for example Data Scientist) and save.
                  Recommendations appear here straight away.
                </p>

                <Link
                  to="/profile"
                  className="job-link"
                >
                  Update profile
                  <ArrowUpRight size={14} />
                </Link>
              </div>

            ) : careerLoading ? (

              <div className="dashboard-empty">
                <strong>Finding roles for you…</strong>

                <p>
                  Searching live openings for {targetRole}
                  {isCitySelected
                    ? ` in ${selectedLocation}`
                    : ''}
                  .
                </p>
              </div>

            ) : recommendations.length === 0 ? (

              <div className="dashboard-empty">
                <strong>
                  {isCitySelected
                    ? 'No jobs found for this location.'
                    : 'No live matches right now'}
                </strong>

                <p>
                  {isCitySelected
                    ? `No open ${targetRole} roles are currently
                       available for candidates in
                       ${selectedLocation}. Try another city or
                       switch to Worldwide / Remote.`
                    : `No open roles came back for ${targetRole}.
                       Try a broader target role or add more
                       skills in your profile.`}
                </p>
              </div>

            ) : (

              <div className="recommendation-list">

                {recommendations.map((job, index) => (

                  <div
                    className="recommendation-card"
                    key={job.link || index}
                  >

                    <div className="recommendation-info">

                      <h3>
                        {job.display_title || job.title}
                      </h3>

                      <div className="recommendation-meta">

                        <span>
                          {job.location || 'Remote'}
                        </span>

                        <span>
                          {job.type || 'Remote'}
                        </span>

                        {Array.isArray(job.matched_skills) &&
                          job.matched_skills.length > 0 && (
                            <span>
                              Matches:{' '}
                              {job.matched_skills.join(', ')}
                            </span>
                          )}

                      </div>

                    </div>

                    <div className="recommendation-match">

                      <span className="match-number">
                        {job.match ?? 0}%
                      </span>

                      <span className="match-label">
                        Match
                      </span>

                      {job.link && (
                        <a
                          className="job-link"
                          href={job.link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View job
                          <ArrowUpRight size={14} />
                        </a>
                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </section>


          {/* ---------- SKILL GAP ---------- */}

          <section className="dashboard-section">

            <div className="dashboard-section-header">

              <div>
                <div className="dashboard-label">
                  SKILL DEVELOPMENT
                </div>

                <h2>Skill Gap</h2>

                <p>
                  {targetRole
                    ? `What ${targetRole} roles ask for versus what you have.`
                    : 'Skills you can improve for your target role.'}
                </p>
              </div>

            </div>


            {!targetRole ? (

              <div className="dashboard-empty">
                <strong>Target role is required</strong>

                <p>
                  Add your desired career role in the profile
                  page to calculate your skill gap.
                </p>
              </div>

            ) : careerLoading ? (

              <div className="dashboard-empty">
                <strong>Calculating your gap…</strong>

                <p>
                  Checking the skills employers ask for.
                </p>
              </div>

            ) : !skillGap ? (

              <div className="dashboard-empty">
                <strong>Skill gap unavailable</strong>

                <p>
                  We could not analyze {targetRole} right now.
                  Refresh the page to try again.
                </p>
              </div>

            ) : (

              <div className="skill-gap-content">

                <div className="skill-progress">

                  <div className="skill-progress-top">
                    <span>Readiness for {targetRole}</span>

                    <strong>{skillMatchPercentage}%</strong>
                  </div>

                  <div className="skill-progress-bar">
                    <div
                      className="skill-progress-fill"
                      style={{
                        width: `${Math.min(
                          Math.max(skillMatchPercentage, 0),
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>

                </div>


                {matchedSkills.length > 0 && (
                  <>
                    <p className="skill-gap-title">
                      SKILLS YOU ALREADY HAVE
                    </p>

                    <div className="skill-list">
                      {matchedSkills.map((skill) => (
                        <span
                          className="skill-tag matched"
                          key={`matched-${skill}`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </>
                )}


                {missingSkills.length > 0 ? (
                  <>
                    <p className="skill-gap-title">
                      SKILLS TO LEARN NEXT
                    </p>

                    <div className="skill-list">
                      {missingSkills
                        .slice(0, 8)
                        .map((skill) => (
                          <span
                            className="skill-tag"
                            key={`missing-${skill}`}
                          >
                            {skill}
                          </span>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="dashboard-empty">
                    <strong>No major gaps found</strong>

                    <p>
                      Your saved skills cover the common
                      requirements for {targetRole}.
                    </p>
                  </div>
                )}

              </div>

            )}

          </section>

        </div>

      </main>

    </div>
  )
}

export default Dashboard
import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import './Profile.css'
import {
  getCurrentUser,
  updateCurrentUser,
  getCurrentUserHistory,
  getTargetRole,
  getUserSkills,
  normalizeSkills,
} from '../utils/userSession'

/* =========================================================
   SUGGESTED TARGET ROLES
   (free text is still allowed — this is only a datalist)
========================================================= */

const ROLE_SUGGESTIONS = [
  'Data Scientist',
  'Data Analyst',
  'Data Engineer',
  'Machine Learning Engineer',
  'AI Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Software Engineer',
  'Android Developer',
  'DevOps Engineer',
  'Business Analyst',
]

/* =========================================================
   INLINE STYLES
   Used so no new Profile.css rules are required.
========================================================= */

const chipRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '4px',
}

const chipStyle = {
  padding: '6px 11px',
  borderRadius: '999px',
  background: '#eef4ff',
  border: '1px solid #dbe7ff',
  color: '#2563eb',
  fontSize: '12px',
  fontWeight: 600,
}

const hintStyle = {
  display: 'block',
  marginTop: '6px',
  color: '#98a2b3',
  fontSize: '11.5px',
  lineHeight: 1.5,
}

const emptyValueStyle = {
  color: '#98a2b3',
  fontWeight: 500,
}

function Profile() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(() => getCurrentUser())
  const [editing, setEditing] = useState(false)

  const [draftProfile, setDraftProfile] = useState(() => {
    const user = getCurrentUser()

    return {
      name: user?.name || '',
      role: user?.role || 'Student',
      email: user?.email || '',
      target_role: getTargetRole(user),
      skillsText: getUserSkills(user).join(', '),
      location: user?.location || '',
    }
  })

  /* ================= AUTH GUARD ================= */

  useEffect(() => {
    if (!getCurrentUser()) {
      navigate('/login')
    }
  }, [navigate])

  /* ================= DERIVED VALUES ================= */

  const displayName = profile?.name || ''

  const initials = useMemo(() => {
    const source =
      displayName ||
      profile?.email?.split('@')[0] ||
      'IT'

    return source
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [displayName, profile])

  const targetRole = getTargetRole(profile)

  const skills = getUserSkills(profile)

  /* ================= REAL ACTIVITY STATS ================= */

  const history = getCurrentUserHistory()

  const totalChecks = history.length

  const safeChecks = history.filter(
    (item) =>
      String(item.riskLevel || '').toLowerCase() === 'low'
  ).length

  const riskChecks = Math.max(totalChecks - safeChecks, 0)

  /* ================= EDIT HANDLERS ================= */

  const handleEdit = () => {
    setDraftProfile({
      name: profile?.name || '',
      role: profile?.role || 'Student',
      email: profile?.email || '',
      target_role: getTargetRole(profile),
      skillsText: getUserSkills(profile).join(', '),
      location: profile?.location || '',
    })

    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const handleChange = (field, value) => {
    setDraftProfile((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    const updated = updateCurrentUser({
      name: draftProfile.name,
      role: draftProfile.role,
      email: draftProfile.email,
      target_role: String(draftProfile.target_role || '').trim(),
      skills: normalizeSkills(draftProfile.skillsText),
      location: draftProfile.location,
    })

    if (updated) {
      setProfile(updated)
    }

    setEditing(false)
  }

  if (!profile) {
    return null
  }

  return (
    <div className="profile-page">

      <Sidebar activePage="profile" />

      <main className="profile-main">

        {/* ================= HEADER ================= */}

        <header className="profile-header">

          <div>
            <div className="profile-eyebrow">
              ACCOUNT
            </div>

            <h1>My Profile</h1>

            <p>
              Manage your InternTrust account and personal information.
            </p>
          </div>

          <div className="profile-header-status">
            <span className="status-dot"></span>
            Account active
          </div>

        </header>


        {/* ================= PROFILE HERO ================= */}

        <section className="profile-hero">

          <div className="profile-avatar">
            {initials}
          </div>

          <div className="profile-identity">

            <h2>{displayName || 'InternTrust Member'}</h2>

            <p>
              {profile.role} • InternTrust Member
            </p>

            <span className="profile-member">
              <span className="mini-shield">✓</span>
              Verified account
            </span>

          </div>

          <div className="profile-actions">

            {!editing ? (
              <button
                className="profile-edit-button"
                onClick={handleEdit}
              >
                <span>✎</span>
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  className="profile-cancel-button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>

                <button
                  className="profile-save-button"
                  onClick={handleSave}
                >
                  <span>✓</span>
                  Save Changes
                </button>
              </>
            )}

          </div>

        </section>


        {/* ================= MAIN GRID ================= */}

        <div className="profile-grid">

          {/* ACCOUNT INFORMATION */}

          <section className="profile-card account-card">

            <div className="card-heading">

              <div className="card-icon blue">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6" />
                </svg>
              </div>

              <div>
                <h3>Personal information</h3>
                <p>Your basic account details</p>
              </div>

            </div>


            <div className="profile-fields">

              <div className="profile-field">

                <span className="field-label">
                  Full name
                </span>

                {editing ? (
                  <input
                    className="profile-edit-input"
                    type="text"
                    value={draftProfile.name}
                    onChange={(e) =>
                      handleChange('name', e.target.value)
                    }
                  />
                ) : (
                  <strong>{profile.name}</strong>
                )}

              </div>


              <div className="profile-field">

                <span className="field-label">
                  Account type
                </span>

                {editing ? (
                  <select
                    className="profile-edit-input"
                    value={draftProfile.role}
                    onChange={(e) =>
                      handleChange('role', e.target.value)
                    }
                  >
                    <option value="Student">Student</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Job Seeker">Job Seeker</option>
                  </select>
                ) : (
                  <strong>{profile.role}</strong>
                )}

              </div>


              <div className="profile-field">

                <span className="field-label">
                  Email address
                </span>

                {editing ? (
                  <input
                    className="profile-edit-input"
                    type="email"
                    value={draftProfile.email}
                    onChange={(e) =>
                      handleChange('email', e.target.value)
                    }
                  />
                ) : (
                  <strong>{profile.email}</strong>
                )}

              </div>


              <div className="profile-field">

                <span className="field-label">
                  Preferred location
                </span>

                {editing ? (
                  <input
                    className="profile-edit-input"
                    type="text"
                    placeholder="India"
                    value={draftProfile.location}
                    onChange={(e) =>
                      handleChange('location', e.target.value)
                    }
                  />
                ) : (
                  <strong>
                    {profile.location || (
                      <span style={emptyValueStyle}>
                        Not set
                      </span>
                    )}
                  </strong>
                )}

              </div>

            </div>

          </section>


          {/* ================= CAREER GOAL =================
              This is the card the Dashboard depends on.
          ================================================= */}

          <section className="profile-card career-card">

            <div className="card-heading">

              <div className="card-icon purple">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="3.4" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              </div>

              <div>
                <h3>Career goal</h3>
                <p>
                  Powers your job recommendations and skill gap
                </p>
              </div>

            </div>


            <div className="profile-fields">

              <div className="profile-field">

                <span className="field-label">
                  Target role
                </span>

                {editing ? (
                  <>
                    <input
                      className="profile-edit-input"
                      type="text"
                      list="target-role-options"
                      placeholder="e.g. Data Scientist"
                      value={draftProfile.target_role}
                      onChange={(e) =>
                        handleChange(
                          'target_role',
                          e.target.value
                        )
                      }
                    />

                    <datalist id="target-role-options">
                      {ROLE_SUGGESTIONS.map((role) => (
                        <option key={role} value={role} />
                      ))}
                    </datalist>

                    <small style={hintStyle}>
                      The job title you are working towards.
                      This is different from your account type.
                    </small>
                  </>
                ) : (
                  <strong>
                    {targetRole || (
                      <span style={emptyValueStyle}>
                        Not set — add one to unlock recommendations
                      </span>
                    )}
                  </strong>
                )}

              </div>


              <div className="profile-field">

                <span className="field-label">
                  Current skills
                </span>

                {editing ? (
                  <>
                    <textarea
                      className="profile-edit-input"
                      rows={3}
                      placeholder="Python, SQL, Pandas, Machine Learning"
                      value={draftProfile.skillsText}
                      onChange={(e) =>
                        handleChange(
                          'skillsText',
                          e.target.value
                        )
                      }
                    />

                    <small style={hintStyle}>
                      Separate each skill with a comma.
                    </small>
                  </>
                ) : skills.length ? (
                  <div style={chipRowStyle}>
                    {skills.map((skill) => (
                      <span key={skill} style={chipStyle}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <strong>
                    <span style={emptyValueStyle}>
                      No skills added yet
                    </span>
                  </strong>
                )}

              </div>


              <div className="profile-field">

                <span className="field-label">
                  Recommendation status
                </span>

                <strong>
                  {targetRole
                    ? `Active for ${targetRole}`
                    : 'Waiting for a target role'}
                </strong>

              </div>

            </div>


            {!editing && (
              <Link
                to="/dashboard"
                className="activity-link"
              >
                View my recommendations
                <span>→</span>
              </Link>
            )}

          </section>


          {/* SECURITY */}

          <section className="profile-card security-card">

            <div className="card-heading">

              <div className="card-icon green">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>

              <div>
                <h3>Account security</h3>
                <p>Your account protection status</p>
              </div>

            </div>


            <div className="security-status">

              <div className="security-check">
                <span>✓</span>
              </div>

              <div>
                <strong>Account protected</strong>
                <p>
                  Your InternTrust account is currently active.
                </p>
              </div>

            </div>


            <div className="security-line">
              <span>Verification status</span>
              <strong className="verified-text">
                Verified
              </strong>
            </div>

            <div className="security-line">
              <span>Account status</span>
              <strong className="active-text">
                Active
              </strong>
            </div>

          </section>


          {/* ACTIVITY */}

          <section className="profile-card activity-card">

            <div className="card-heading">

              <div className="card-icon purple">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 19V5" />
                  <path d="M4 19h16" />
                  <path d="M7 15l3-4 3 2 5-7" />
                </svg>
              </div>

              <div>
                <h3>Your activity</h3>
                <p>A quick look at your InternTrust usage</p>
              </div>

            </div>


            <div className="activity-stats">

              <div className="activity-stat">
                <strong>{totalChecks}</strong>
                <span>Total checks</span>
              </div>

              <div className="activity-stat">
                <strong>{safeChecks}</strong>
                <span>Safe opportunities</span>
              </div>

              <div className="activity-stat">
                <strong>{riskChecks}</strong>
                <span>Potential risks</span>
              </div>

            </div>

            <Link
              to="/history"
              className="activity-link"
            >
              View analysis history
              <span>→</span>
            </Link>

          </section>


          {/* PROTECTION MESSAGE */}

          <section className="profile-protection">

            <div className="protection-glow"></div>

            <div className="protection-icon">
              🛡
            </div>

            <div>
              <span>INTERNTRUST PROTECTION</span>

              <h3>
                Verify before you apply.
              </h3>

              <p>
                Always analyze an internship or job opportunity
                before sharing personal information or applying.
              </p>
            </div>

            <Link
              to="/analyze"
              className="protection-button"
            >
              Analyze opportunity
              <span>→</span>
            </Link>

          </section>

        </div>

      </main>

    </div>
  )
}

export default Profile
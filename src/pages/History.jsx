import Sidebar from '../components/Sidebar'
import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './History.css'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Search,
  Plus,
  ChevronDown,
  MapPin,
  Briefcase,
  CalendarDays,
  ListChecks,
  ExternalLink,
} from 'lucide-react'
import { getAuthToken, getCurrentUser } from '../utils/userSession'

const STATUS_META = {
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    className: 'status-verified',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'status-pending',
  },
  failed: {
    label: 'Failed',
    icon: ShieldX,
    className: 'status-failed',
  },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
]

function formatDate(iso) {
  const d = new Date(iso)

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso) {
  const d = new Date(iso)

  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ScoreRing({ score, status }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const pct =
    score == null
      ? 0
      : Math.max(0, Math.min(100, score))

  const offset =
    circumference - (pct / 100) * circumference

  return (
    <div
      className={`score-ring score-ring-${status}`}
      aria-hidden="true"
    >
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle
          className="score-ring-track"
          cx="22"
          cy="22"
          r={radius}
          strokeWidth="4"
          fill="none"
        />

        {score != null && (
          <circle
            className="score-ring-fill"
            cx="22"
            cy="22"
            r={radius}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>

      <span className="score-ring-value">
        {score == null ? '—' : score}
      </span>
    </div>
  )
}

function StatusBadge({ status }) {
  const meta =
    STATUS_META[status] ?? STATUS_META.pending

  const Icon = meta.icon

  return (
    <span
      className={`status-badge ${meta.className}`}
    >
      <Icon size={14} strokeWidth={2.25} />
      {meta.label}
    </span>
  )
}

function History() {
  const navigate = useNavigate()

  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      navigate('/login')
      return
    }

    const loadHistory = async () => {
      try {
        const response = await fetch(
          '/api/auth/history',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
            },
          }
        )

        const data = await response
          .json()
          .catch(() => ({}))

        if (!response.ok) {
          throw new Error(
            data.error || 'Failed to load history.'
          )
        }

        setHistoryData(
          Array.isArray(data.history)
            ? data.history
            : []
        )
      } catch (error) {
        console.error(
          'History loading error:',
          error
        )

        setHistoryData([])
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [navigate])

  const history = historyData.map((item) => ({
    id: item.id,

    company:
      item.company ||
      item.title ||
      'Opportunity',

    role:
      item.title ||
      'Role',

    location: 'India',

    status:
      String(item.riskLevel || '').toLowerCase() === 'low'
        ? 'verified'
        : String(item.riskLevel || '').toLowerCase() === 'medium'
          ? 'pending'
          : 'failed',

    score: Number(
      item.finalRiskScore || 0
    ),

    date:
      item.createdAt ||
      new Date().toISOString(),

    summary:
      `Risk level: ${item.riskLevel || 'Unknown'}; score: ${item.finalRiskScore || 0}.`,
  }))

  const counts = useMemo(() => {
    return {
      total: history.length,

      verified:
        history.filter(
          (h) => h.status === 'verified'
        ).length,

      pending:
        history.filter(
          (h) => h.status === 'pending'
        ).length,

      failed:
        history.filter(
          (h) => h.status === 'failed'
        ).length,
    }
  }, [history])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return history.filter((item) => {
      const matchesFilter =
        activeFilter === 'all' ||
        item.status === activeFilter

      const matchesQuery =
        !q ||
        item.company.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)

      return matchesFilter && matchesQuery
    })
  }, [history, query, activeFilter])

  const toggleExpanded = (id) => {
    setExpandedId((current) =>
      current === id ? null : id
    )
  }

  return (
    <div className="dashboard-page">

      <Sidebar activePage="history" />

      <main className="dashboard-main">

        <div className="history-page">

          <div className="history-container">

            <header className="history-header">

              <div className="history-header-text">

                <h1>
                  Verification History
                </h1>

                <p>
                  Every internship check you've
                  run is stored here, so you can
                  revisit results, track outcomes,
                  and spot patterns over time.
                </p>

              </div>

              <button
                className="btn-primary"
                type="button"
                onClick={() => navigate('/analyze')}
              >
                <Plus
                  size={18}
                  strokeWidth={2.25}
                />

                Analyze New Internship
              </button>

            </header>

            <section
              className="stats-grid"
              aria-label="History summary"
            >

              <div className="stat-card">

                <div className="stat-icon stat-icon-total">
                  <ListChecks
                    size={20}
                    strokeWidth={2.25}
                  />
                </div>

                <div className="stat-body">
                  <span className="stat-value">
                    {counts.total}
                  </span>

                  <span className="stat-label">
                    Total Analyses
                  </span>
                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon stat-icon-verified">
                  <ShieldCheck
                    size={20}
                    strokeWidth={2.25}
                  />
                </div>

                <div className="stat-body">
                  <span className="stat-value">
                    {counts.verified}
                  </span>

                  <span className="stat-label">
                    Verified
                  </span>
                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon stat-icon-pending">
                  <Clock
                    size={20}
                    strokeWidth={2.25}
                  />
                </div>

                <div className="stat-body">
                  <span className="stat-value">
                    {counts.pending}
                  </span>

                  <span className="stat-label">
                    Pending
                  </span>
                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon stat-icon-failed">
                  <ShieldX
                    size={20}
                    strokeWidth={2.25}
                  />
                </div>

                <div className="stat-body">
                  <span className="stat-value">
                    {counts.failed}
                  </span>

                  <span className="stat-label">
                    Failed
                  </span>
                </div>

              </div>

            </section>

            <section className="history-controls">

              <div className="search-field">

                <Search
                  size={18}
                  strokeWidth={2}
                />

                <input
                  type="text"
                  placeholder="Search by company, role, or location"
                  value={query}
                  onChange={(e) =>
                    setQuery(e.target.value)
                  }
                  aria-label="Search verification history"
                />

              </div>

              <div
                className="filter-tabs"
                role="tablist"
                aria-label="Filter by status"
              >

                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={
                      activeFilter === f.key
                    }
                    className={`filter-tab ${
                      activeFilter === f.key
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={() =>
                      setActiveFilter(f.key)
                    }
                  >
                    {f.label}

                    <span className="filter-count">
                      {f.key === 'all'
                        ? counts.total
                        : counts[f.key]}
                    </span>
                  </button>
                ))}

              </div>

            </section>

            <section
              className="history-list"
              aria-label="Verification records"
            >

              {loading ? (

                <div className="empty-state">

                  <Clock
                    size={28}
                    strokeWidth={1.75}
                  />

                  <h3>
                    Loading history...
                  </h3>

                  <p>
                    Fetching your verification records.
                  </p>

                </div>

              ) : filtered.length === 0 ? (

                <div className="empty-state">

                  <ShieldAlert
                    size={28}
                    strokeWidth={1.75}
                  />

                  <h3>
                    No matching records
                  </h3>

                  <p>
                    Try a different search term
                    or clear the status filter.
                  </p>

                </div>

              ) : (

                filtered.map((item) => {

                  const isExpanded =
                    expandedId === item.id

                  return (
                    <article
                      key={item.id}
                      className={`history-row ${
                        isExpanded
                          ? 'is-expanded'
                          : ''
                      }`}
                    >

                      <button
                        type="button"
                        className="history-row-main"
                        onClick={() =>
                          toggleExpanded(item.id)
                        }
                        aria-expanded={isExpanded}
                      >

                        <div className="row-cell row-cell-identity">

                          <ScoreRing
                            score={item.score}
                            status={item.status}
                          />

                          <div className="identity-text">

                            <span className="company-name">
                              {item.company}
                            </span>

                            <span className="role-name">

                              <Briefcase
                                size={13}
                                strokeWidth={2}
                              />

                              {item.role}

                            </span>

                          </div>

                        </div>

                        <div className="row-cell row-cell-meta">

                          <span className="meta-item">

                            <MapPin
                              size={13}
                              strokeWidth={2}
                            />

                            {item.location}

                          </span>

                          <span className="meta-item">

                            <CalendarDays
                              size={13}
                              strokeWidth={2}
                            />

                            {formatDate(item.date)}
                            {' · '}
                            {formatTime(item.date)}

                          </span>

                        </div>

                        <div className="row-cell row-cell-status">

                          <StatusBadge
                            status={item.status}
                          />

                        </div>

                        <div className="row-cell row-cell-action">

                          <ChevronDown
                            className="chevron"
                            size={18}
                            strokeWidth={2}
                          />

                        </div>

                      </button>

                      {isExpanded && (

                        <div className="history-row-details">

                          <p>
                            {item.summary}
                          </p>

                          <div className="details-footer">

                            <span className="record-id">
                              Record ID: {item.id}
                            </span>

                            <button
                              type="button"
                              className="btn-secondary"
                            >
                              View Full Report

                              <ExternalLink
                                size={14}
                                strokeWidth={2.25}
                              />
                            </button>

                          </div>

                        </div>

                      )}

                    </article>
                  )
                })

              )}

            </section>

          </div>

        </div>

      </main>

    </div>
  )
}

export default History
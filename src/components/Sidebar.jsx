import { Link } from 'react-router-dom'
import './Sidebar.css'
import { clearCurrentUser } from '../utils/userSession'

function Sidebar({ activePage }) {
  return (
    <aside className="dashboard-sidebar">

      <Link to="/" className="dashboard-logo">
        <span>Intern</span>Trust
      </Link>

      <nav className="dashboard-nav">

        <Link
          to="/dashboard"
          className={activePage === 'dashboard' ? 'active' : ''}
        >
          <span>⌂</span>
          Dashboard
        </Link>

        <Link
          to="/analyze"
          className={activePage === 'analyze' ? 'active' : ''}
        >
          <span>⌕</span>
          Analyze
        </Link>

        <Link
          to="/history"
          className={activePage === 'history' ? 'active' : ''}
        >
          <span>◷</span>
          History
        </Link>

        <Link
          to="/profile"
          className={activePage === 'profile' ? 'active' : ''}
        >
          <span>◎</span>
          Profile
        </Link>

      </nav>

      <div className="sidebar-bottom">

        <div className="security-box">
          <span>🛡</span>

          <div>
            <strong>Stay protected</strong>
            <p>Verify before you apply.</p>
          </div>
        </div>

        <Link to="/login" className="logout-link" onClick={clearCurrentUser}>
          ← Logout
        </Link>

      </div>

    </aside>
  )
}

export default Sidebar
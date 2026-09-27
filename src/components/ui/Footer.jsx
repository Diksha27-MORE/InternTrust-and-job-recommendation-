import "./Footer.css";
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="interntrust-footer">
      <div className="footer-top">

        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo">
            <svg className="footer-logo-icon" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 4L6 20"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            InternTrust
          </div>

          <p className="footer-build-by">
            Build by <a href="#">@YourHandle</a>
          </p>

          <a href="#" className="footer-share-btn">
            Share Your Thoughts On
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.9 1.2h3.7l-8.1 9.3 9.5 12.3h-7.4l-5.8-7.6-6.6 7.6H.5l8.7-9.9L.1 1.2h7.6l5.3 7 6-7Z" />
            </svg>
          </a>

          <p className="footer-copyright">
            © 2026 InternTrust. All rights reserved.
          </p>
        </div>

        {/* Pages */}
        <div className="footer-column">
          <h4>Pages</h4>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </div>

        {/* Socials */}
        <div className="footer-column">
          <h4>Connect</h4>
          <a href="#contact">Contact</a>
          <Link to="/login">Login</Link>
          <Link to="/register">Create Account</Link>
        </div>

        {/* Legal */}
        <div className="footer-column">
          <h4>Legal</h4>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </div>

      </div>

      {/* Large background branding */}
      <div className="footer-wordmark">InternTrust</div>
    </footer>
  );
}

export default Footer;
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Home',
    type: 'home',
  },
  {
    key: 'how-it-works',
    label: 'How It Works',
    type: 'bookmark',
    hash: '#how-it-works',
  },
  {
    key: 'features',
    label: 'Features',
    type: 'plus',
    hash: '#features',
  },
  {
    key: 'about',
    label: 'About',
    type: 'user',
    hash: '#about',
  },
  {
    key: 'login',
    label: 'Login',
    type: 'settings',
    path: '/login',
  },
  {
    key: 'register',
    label: 'Create Account',
    type: 'user',
    path: '/register',
  },
]

const SCROLL_THRESHOLD = 8
const HERO_EXIT_BUFFER = 120

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeItem, setActiveItem] = useState('home')
  const [inHero, setInHero] = useState(true)

  /* =====================================================
     SCROLL SHADOW
     ===================================================== */

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD)
    }

    onScroll()

    window.addEventListener('scroll', onScroll, {
      passive: true,
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  /* =====================================================
     SHOW NAVBAR ONLY WHILE HERO IS VISIBLE
     ===================================================== */

  useEffect(() => {
    const heroEl = document.getElementById('home')

    if (!heroEl) return

    const handleHeroVisibility = () => {
      const heroBottom =
        heroEl.offsetTop + heroEl.offsetHeight

      setInHero(
        window.scrollY < heroBottom - HERO_EXIT_BUFFER
      )
    }

    handleHeroVisibility()

    window.addEventListener(
      'scroll',
      handleHeroVisibility,
      { passive: true }
    )

    window.addEventListener(
      'resize',
      handleHeroVisibility
    )

    return () => {
      window.removeEventListener(
        'scroll',
        handleHeroVisibility
      )

      window.removeEventListener(
        'resize',
        handleHeroVisibility
      )
    }
  }, [])

  /* =====================================================
     DETECT ACTIVE SECTION
     ===================================================== */

  useEffect(() => {
    const sections = [
      {
        id: 'how-it-works',
        key: 'how-it-works',
      },
      {
        id: 'features',
        key: 'features',
      },
      {
        id: 'about',
        key: 'about',
      },
    ]

    const handleSectionScroll = () => {
      const scrollPosition = window.scrollY + 180

      let currentSection = 'home'

      sections.forEach((section) => {
        const element = document.getElementById(section.id)

        if (element) {
          const sectionTop = element.offsetTop

          if (scrollPosition >= sectionTop) {
            currentSection = section.key
          }
        }
      })

      setActiveItem(currentSection)
    }

    handleSectionScroll()

    window.addEventListener(
      'scroll',
      handleSectionScroll,
      { passive: true }
    )

    return () => {
      window.removeEventListener(
        'scroll',
        handleSectionScroll
      )
    }
  }, [])

  /* =====================================================
     HASH NAVIGATION
     ===================================================== */

  const handleHashNav = (e, hash, key) => {
    e.preventDefault()

    setActiveItem(key)

    const element = document.querySelector(hash)

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  /* =====================================================
     HOME
     ===================================================== */

  const handleHome = () => {
    setActiveItem('home')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  /* =====================================================
     ICONS
     ===================================================== */

  const renderIcon = (type) => {
    switch (type) {

      /* HOME */
      case 'home':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-7h6v7" />
          </svg>
        )

      /* HOW IT WORKS */
      case 'bookmark':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" />
          </svg>
        )

      /* FEATURES */
      case 'plus':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
        )

      /* ABOUT */
      case 'user':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="7" r="3.5" />
            <path d="M5 21v-1.5A5.5 5.5 0 0 1 10.5 14h3A5.5 5.5 0 0 1 19 19.5V21" />
          </svg>
        )

      /* LOGIN */
      case 'settings':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />

            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20h-2.55v-.1a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 8.1 15a1.7 1.7 0 0 0-1.56-1.04H6v-2.55h.1A1.7 1.7 0 0 0 7.66 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.8-1.8.06.06A1.7 1.7 0 0 0 11 6a1.7 1.7 0 0 0 1.04-1.56V4h2.55v.1A1.7 1.7 0 0 0 15.63 6a1.7 1.7 0 0 0 1.88.34l.06-.06 1.8 1.8-.06.06A1.7 1.7 0 0 0 19 10a1.7 1.7 0 0 0 1.56 1.04H21v2.55h-.1A1.7 1.7 0 0 0 19.4 15Z" />
          </svg>
        )

      default:
        return null
    }
  }

  /* =====================================================
     HIDE OUTSIDE HERO
     ===================================================== */

 

  /* =====================================================
     NAVBAR
     ===================================================== */

  return (
    <nav
      className={`interntrust-floating-navbar ${
        scrolled ? 'is-scrolled' : ''
      } ${!inHero ? 'is-hidden' : ''}`}
    >
      <div className="interntrust-floating-nav-inner">

        <div className="interntrust-nav-glow"></div>

        {NAV_ITEMS.map((item) => {

          const isActive =
            activeItem === item.key

          /* HOME */
          if (item.key === 'home') {
            return (
              <button
                key={item.key}
                type="button"
                className={`interntrust-floating-nav-item ${
                  isActive ? 'is-active' : ''
                }`}
                aria-label={item.label}
                onClick={handleHome}
              >

                <span className="interntrust-floating-icon">
                  {renderIcon(item.type)}
                </span>

                <span className="interntrust-floating-label">
                  {item.label}
                </span>

                {isActive && (
                  <span className="interntrust-active-light"></span>
                )}

              </button>
            )
          }

          /* LOGIN */
          if (item.path) {
            return (
              <Link
                key={item.key}
                to={item.path}
                className="interntrust-floating-nav-item"
                aria-label={item.label}
              >

                <span className="interntrust-floating-icon">
                  {renderIcon(item.type)}
                </span>

                <span className="interntrust-floating-label">
                  {item.label}
                </span>

              </Link>
            )
          }

          /* HOME SECTIONS */
          return (
            <a
              key={item.key}
              href={item.hash}
              className={`interntrust-floating-nav-item ${
                isActive ? 'is-active' : ''
              }`}
              aria-label={item.label}
              onClick={(e) =>
                handleHashNav(
                  e,
                  item.hash,
                  item.key
                )
              }
            >

              <span className="interntrust-floating-icon">
                {renderIcon(item.type)}
              </span>

              <span className="interntrust-floating-label">
                {item.label}
              </span>

              {isActive && (
                <span className="interntrust-active-light"></span>
              )}

            </a>
          )
        })}

      </div>
    </nav>
  )
}

export default Navbar
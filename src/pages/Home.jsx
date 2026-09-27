import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import '../App.css'
import './Home.css'

import Navbar from '../components/Navbar'
import IntroAnimation from '../components/IntroAnimation'

import HowItWorks from '../components/ui/HowItWorks'
import Features from '../components/ui/Features'
import Footer from '../components/ui/Footer'

import heroVideo from '../assets/hero.mp4'

// Module-scope flag: prevents the intro from replaying during
// client-side navigation or Vite HMR. It resets on a real refresh.
let introConsumed = false

function shouldPlayIntro() {
  if (typeof window === 'undefined') return false

  if (introConsumed) return false

  introConsumed = true

  // Only play the intro on the homepage.
  if (window.location.pathname !== '/') return false

  const nav = performance.getEntriesByType('navigation')[0]

  const type =
    nav?.type ??
    (performance.navigation?.type === 1 ? 'reload' : 'navigate')

  // Play on a real page load or browser refresh.
  // Skip back/forward navigation.
  return type === 'reload' || type === 'navigate'
}

function Home() {
  const [showIntro, setShowIntro] = useState(shouldPlayIntro)

  const heroRef = useRef(null)
  const videoRef = useRef(null)
  const glowRef = useRef(null)

  // Target = where the mouse actually is.
  // Current = the smoothed/eased position we render.
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })

  const rafId = useRef(null)
  const hasMoved = useRef(false)

  useEffect(() => {
    const heroEl = heroRef.current

    if (!heroEl) return

    // Start the glow centered so it doesn't fly in from a corner.
    const rect = heroEl.getBoundingClientRect()

    target.current = {
      x: rect.width / 2,
      y: rect.height / 2,
    }

    current.current = {
      x: rect.width / 2,
      y: rect.height / 2,
    }

    const handleMouseMove = (e) => {
      const r = heroEl.getBoundingClientRect()

      target.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
      }

      hasMoved.current = true
    }

    const handleMouseLeave = () => {
      const r = heroEl.getBoundingClientRect()

      target.current = {
        x: r.width / 2,
        y: r.height / 2,
      }
    }

    const animate = () => {
      // Simple lerp easing for a smooth,
      // slightly delayed mouse follow.
      const ease = 0.08

      current.current.x +=
        (target.current.x - current.current.x) * ease

      current.current.y +=
        (target.current.y - current.current.y) * ease

      // Mouse-follow glow
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(
          ${current.current.x}px,
          ${current.current.y}px,
          0
        )`

        glowRef.current.style.opacity = hasMoved.current
          ? '1'
          : '0'
      }

      // Background video parallax
      if (videoRef.current) {
        const r = heroEl.getBoundingClientRect()

        const nx =
          (current.current.x / r.width - 0.5) * 2

        const ny =
          (current.current.y / r.height - 0.5) * 2

        const maxShift = 14

        videoRef.current.style.transform = `scale(1.08) translate3d(
          ${-nx * maxShift}px,
          ${-ny * maxShift}px,
          0
        )`
      }

      rafId.current = requestAnimationFrame(animate)
    }

    rafId.current = requestAnimationFrame(animate)

    heroEl.addEventListener(
      'mousemove',
      handleMouseMove
    )

    heroEl.addEventListener(
      'mouseleave',
      handleMouseLeave
    )

    return () => {
      heroEl.removeEventListener(
        'mousemove',
        handleMouseMove
      )

      heroEl.removeEventListener(
        'mouseleave',
        handleMouseLeave
      )

      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [])

  return (
    <>
      {/* =========================
          INTRO ANIMATION
      ========================= */}

      {showIntro && (
        <IntroAnimation
          onComplete={() => setShowIntro(false)}
        />
      )}

      {/* =========================
          NAVBAR
          Mounted only once the intro has finished. Its own
          scroll logic (see Navbar.jsx) further limits it to
          being visible only while the hero section below is
          in view — it fully unmounts once you scroll past it.
      ========================= */}

      {!showIntro && <Navbar />}

      {/* =========================
          CINEMATIC HERO
      ========================= */}

      <main
        id="home"
        className="interntrust-home"
        ref={heroRef}
      >

        {/* Background Video */}

        <video
          ref={videoRef}
          className="interntrust-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source
            src={heroVideo}
            type="video/mp4"
          />
        </video>

        {/* Darkening overlay */}

        <div className="interntrust-overlay"></div>

        {/* Mouse-follow glow */}

        <div
          className="interntrust-cursor-glow"
          ref={glowRef}
        ></div>

        {/* Hero Content */}

        <div className="interntrust-content">

          <h1 className="interntrust-title">
            InternTrust
          </h1>

          <p className="interntrust-tagline">
            Verify Internships. Detect Fake. Build Trust.
          </p>

          <a
            href="#how-it-works"
            className="interntrust-explore"
          >
            Explore More

            <span className="interntrust-explore-arrow">
              ↓
            </span>
          </a>

          <Link
            to="/register"
            className="interntrust-explore interntrust-create-account"
          >
            Create Account
            <span className="interntrust-explore-arrow">
              →
            </span>
          </Link>

        </div>

      </main>

      {/* =========================
    HOW IT WORKS
========================= */}

<section id="how-it-works" className="interntrust-section-anchor">
  <HowItWorks />
</section>

{/* =========================
    FEATURES
========================= */}

<section id="features" className="interntrust-section-anchor">
  <Features />
</section>

{/* =========================
    FOOTER
========================= */}

<section id="about" className="interntrust-section-anchor">
  <Footer />
</section>
    </>
  )
}

export default Home
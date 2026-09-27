import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

import Home from './pages/Home'

import Login from './pages/Login'
import Register from './pages/Register'
import Analyze from './pages/Analyze'
import History from './pages/History'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            HOME
            Navbar is handled inside
            Home.jsx only. "How It Works"
            is a section on this page,
            not a separate route.
        ========================= */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* =========================
            OTHER PAGES
            NO NAVBAR
        ========================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/analyze"
          element={<Analyze />}
        />

        <Route
          path="/history"
          element={<History />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App
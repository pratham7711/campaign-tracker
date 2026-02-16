import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './components/Auth'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import GetVoterSlip from './pages/GetVoterSlip'
import './App.css'

function App() {
  const [guest, setGuest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing guest in localStorage
    const savedGuest = localStorage.getItem('campaignTrackerGuest')
    if (savedGuest) {
      try {
        setGuest(JSON.parse(savedGuest))
      } catch (e) {
        localStorage.removeItem('campaignTrackerGuest')
      }
    }
    setLoading(false)
  }, [])

  const handleGuestLogin = (guestUser) => {
    setGuest(guestUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('campaignTrackerGuest')
    setGuest(null)
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            guest ? (
              <Dashboard user={guest} onLogout={handleLogout} />
            ) : (
              <Auth onGuestLogin={handleGuestLogin} />
            )
          }
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/getyourvoterslip" element={<GetVoterSlip />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

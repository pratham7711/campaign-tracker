import { useState } from 'react'

export default function Auth({ onGuestLogin }) {
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    const name = guestName.trim()
    if (!name) {
      setError('Please enter your name')
      return
    }

    if (name.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    // Generate unique guest ID (name + timestamp + random)
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Save to localStorage
    const guestUser = {
      id: guestId,
      displayName: name,
      createdAt: new Date().toISOString()
    }

    localStorage.setItem('campaignTrackerGuest', JSON.stringify(guestUser))
    onGuestLogin(guestUser)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Election Campaign Tracker</h1>
        <h2>Enter Your Name</h2>
        <p className="auth-subtitle">No login required - just enter your name to start tracking calls</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="guestName">Your Name</label>
            <input
              id="guestName"
              type="text"
              placeholder="Enter your name (shown on leaderboard)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary">
            Start Tracking
          </button>
        </form>
      </div>
    </div>
  )
}

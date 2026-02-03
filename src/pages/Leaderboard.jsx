import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      console.log('Loading leaderboard...')

      // Get call counts per user
      const { data: callData, error: callError } = await supabase
        .from('call_records')
        .select('user_id')

      console.log('Call data:', callData, 'Error:', callError)
      if (callError) throw callError

      // Count calls per user
      const callCounts = {}
      if (callData) {
        callData.forEach((record) => {
          callCounts[record.user_id] = (callCounts[record.user_id] || 0) + 1
        })
      }

      // Get user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, display_name')

      console.log('Profiles:', profiles, 'Error:', profileError)
      if (profileError) throw profileError

      // Combine data and sort by call count
      const leaderboardData = (profiles || [])
        .map((profile) => ({
          id: profile.id,
          displayName: profile.display_name,
          callCount: callCounts[profile.id] || 0,
        }))
        .sort((a, b) => b.callCount - a.callCount)

      console.log('Leaderboard data:', leaderboardData)
      setLeaderboard(leaderboardData)
    } catch (err) {
      console.error('Error loading leaderboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <div className="leaderboard-container">
          <h1>Leaderboard</h1>
          <div className="error-message">Error loading leaderboard: {error}</div>
          <Link to="/" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        <h1>Campaign Leaderboard</h1>
        <p className="leaderboard-subtitle">Top performers by calls made</p>

        {leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <p>No data yet. Start making calls to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="leaderboard-table">
            <table>
              <thead>
                <tr>
                  <th className="col-rank">Rank</th>
                  <th className="col-name">Name</th>
                  <th className="col-calls">Calls Made</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, index) => (
                  <tr
                    key={user.id}
                    className={
                      index === 0
                        ? 'rank-gold'
                        : index === 1
                        ? 'rank-silver'
                        : index === 2
                        ? 'rank-bronze'
                        : ''
                    }
                  >
                    <td className="col-rank">
                      {index === 0 && <span className="medal">🥇</span>}
                      {index === 1 && <span className="medal">🥈</span>}
                      {index === 2 && <span className="medal">🥉</span>}
                      {index > 2 && <span>{index + 1}</span>}
                    </td>
                    <td className="col-name">{user.displayName}</td>
                    <td className="col-calls">{user.callCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Link to="/" className="btn-back">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

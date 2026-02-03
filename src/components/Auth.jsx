import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        // Check if profile exists, create if not
        if (data.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', data.user.id)
            .single()

          if (!profile) {
            // Create profile with email as display name
            await supabase
              .from('user_profiles')
              .insert([{ id: data.user.id, display_name: email.split('@')[0] }])
          }
        }
      } else {
        // Signup
        if (!displayName.trim()) {
          throw new Error('Display name is required')
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error

        // Create user profile with display name
        if (data.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{ id: data.user.id, display_name: displayName.trim() }])

          if (profileError) {
            console.error('Profile creation error:', profileError)
          }
        }

        setMessage('Account created! You can now log in.')
        setIsLogin(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Election Campaign Tracker</h1>
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                placeholder="Your name (shown on leaderboard)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
              setMessage(null)
            }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}

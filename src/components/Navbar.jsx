import { supabase } from '../supabaseClient'

export default function Navbar({ user, callCount }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Campaign Tracker</h1>
      </div>
      <div className="navbar-info">
        <span className="call-count">Calls Made: <strong>{callCount}</strong></span>
        <span className="user-email">{user?.email}</span>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  )
}

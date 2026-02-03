export default function Navbar({ user, callCount, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Campaign Tracker</h1>
      </div>
      <div className="navbar-info">
        <span className="call-count">Calls Made: <strong>{callCount}</strong></span>
        <span className="user-email">{user?.displayName}</span>
        <button onClick={onLogout} className="btn-logout">
          Change Name
        </button>
      </div>
    </nav>
  )
}

export default function Navbar({ user, callCount, exportCount, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>
          <span className="brand-full">Campaign Tracker</span>
          <span className="brand-short">Tracker</span>
        </h1>
      </div>
      <div className="navbar-info">
        <div className="stats-group">
          <span className="call-count">
            <span className="stats-label-full">Calls: </span>
            <span className="stats-label-short">📞 </span>
            <strong>{callCount}</strong>
          </span>
          <span className="export-count">
            <span className="stats-label-full">Exports: </span>
            <span className="stats-label-short">📥 </span>
            <strong>{exportCount}</strong>
          </span>
        </div>
        <span className="user-email" title={user?.displayName}>{user?.displayName}</span>
        <button onClick={onLogout} className="btn-logout">
          <span className="logout-full">Change Name</span>
          <span className="logout-short">Change</span>
        </button>
      </div>
    </nav>
  )
}

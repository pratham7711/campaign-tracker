import { useState } from 'react'

export default function VoterFilter({ onFilter, totalVoters }) {
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    pincode: '',
    address: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onFilter(filters)
  }

  const handleClear = () => {
    setFilters({
      firstName: '',
      lastName: '',
      pincode: '',
      address: '',
    })
    onFilter({
      firstName: '',
      lastName: '',
      pincode: '',
      address: '',
    })
  }

  return (
    <div className="filter-container">
      <h2>Filter Voters</h2>
      <p className="filter-subtitle">Total voters in database: {totalVoters.toLocaleString()}</p>

      <form onSubmit={handleSubmit} className="filter-form">
        <div className="filter-grid">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="e.g., RAJESH"
              value={filters.firstName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Surname / Last Name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="e.g., SHARMA"
              value={filters.lastName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pincode">Pincode</label>
            <input
              id="pincode"
              name="pincode"
              type="text"
              placeholder="e.g., 110019"
              value={filters.pincode}
              onChange={handleChange}
              maxLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address / Area</label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="e.g., NOIDA, KALKAJI"
              value={filters.address}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button type="submit" className="btn-primary">
            Search
          </button>
          <button type="button" onClick={handleClear} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </form>
    </div>
  )
}

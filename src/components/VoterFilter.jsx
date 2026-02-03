import { useState } from 'react'

export default function VoterFilter({ onFilter, totalVoters }) {
  const [filters, setFilters] = useState({
    name: '',
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
      name: '',
      pincode: '',
      address: '',
    })
    onFilter({
      name: '',
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
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., SHARMA, RAJESH, KUMAR"
              value={filters.name}
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

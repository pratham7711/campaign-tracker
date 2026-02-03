import { useState } from 'react'

export default function VoterList({ voters, calledVoters, onToggleCall, loading }) {
  const [currentPage, setCurrentPage] = useState(1)
  const votersPerPage = 50

  const totalPages = Math.ceil(voters.length / votersPerPage)
  const startIndex = (currentPage - 1) * votersPerPage
  const endIndex = startIndex + votersPerPage
  const currentVoters = voters.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (voters.length === 0) {
    return (
      <div className="voter-list-empty">
        <p>No voters found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="voter-list-container">
      <div className="voter-list-header">
        <h3>
          Showing {startIndex + 1}-{Math.min(endIndex, voters.length)} of{' '}
          {voters.length.toLocaleString()} voters
        </h3>
        <span className="called-count">
          Called: {calledVoters.size} / {voters.length}
        </span>
      </div>

      <div className="voter-list">
        <table>
          <thead>
            <tr>
              <th className="col-checkbox">Called</th>
              <th className="col-name">Name</th>
              <th className="col-contact">Contact</th>
              <th className="col-address">Address</th>
              <th className="col-pincode">Pincode</th>
            </tr>
          </thead>
          <tbody>
            {currentVoters.map((voter) => {
              const isCalled = calledVoters.has(voter.id)
              return (
                <tr key={voter.id} className={isCalled ? 'row-called' : ''}>
                  <td className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={isCalled}
                      onChange={() => onToggleCall(voter.id)}
                      disabled={loading}
                      aria-label={`Mark ${voter.fullName} as called`}
                    />
                  </td>
                  <td className="col-name">
                    <div className="voter-name">{voter.fullName}</div>
                    <div className="voter-id">ID: {voter.id}</div>
                  </td>
                  <td className="col-contact">
                    {voter.contact ? (
                      <a href={`tel:${voter.contact}`} className="phone-link">
                        {voter.contact}
                      </a>
                    ) : (
                      <span className="no-contact">No contact</span>
                    )}
                  </td>
                  <td className="col-address">{voter.address || '-'}</td>
                  <td className="col-pincode">{voter.pincode || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="btn-page"
          >
            First
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn-page"
          >
            Prev
          </button>

          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="btn-page"
          >
            Next
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="btn-page"
          >
            Last
          </button>
        </div>
      )}
    </div>
  )
}

import { useState, Fragment } from 'react'
import { exportVotersToPdf, exportVotersToListPdf, exportVotersToListDocx } from '../utils/exportPdf'

export default function VoterList({ voters, calledVoters, onToggleCall, loading, filters }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [showMetadata, setShowMetadata] = useState(false)
  const [expandedVoter, setExpandedVoter] = useState(null)
  const votersPerPage = 50

  const totalPages = Math.ceil(voters.length / votersPerPage)
  const startIndex = (currentPage - 1) * votersPerPage
  const endIndex = startIndex + votersPerPage
  const currentVoters = voters.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleVoterMetadata = (voterId) => {
    setExpandedVoter(expandedVoter === voterId ? null : voterId)
  }

  const handleExportPdf = () => {
    exportVotersToPdf(voters, filters || {})
  }

  const handleExportListPdf = () => {
    exportVotersToListPdf(voters, filters || {})
  }

  const handleExportDocx = () => {
    exportVotersToListDocx(voters, filters || {})
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
        <div className="header-actions">
          <button onClick={handleExportPdf} className="btn-export">
            Export Table
          </button>
          <button onClick={handleExportListPdf} className="btn-export btn-export-list">
            Export List
          </button>
          <button onClick={handleExportDocx} className="btn-export btn-export-docx">
            Export DOCX
          </button>
          <label className="metadata-toggle">
            <input
              type="checkbox"
              checked={showMetadata}
              onChange={(e) => setShowMetadata(e.target.checked)}
            />
            Show Raw Data
          </label>
          <span className="called-count">
            Called: {calledVoters.size} / {voters.length}
          </span>
        </div>
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
              {showMetadata && <th className="col-metadata">Raw Data</th>}
            </tr>
          </thead>
          <tbody>
            {currentVoters.map((voter) => {
              const isCalled = calledVoters.has(voter.id)
              const isExpanded = expandedVoter === voter.id
              return (
                <Fragment key={voter.id}>
                  <tr className={isCalled ? 'row-called' : ''}>
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
                    {showMetadata && (
                      <td className="col-metadata">
                        {voter.metadata ? (
                          <button
                            className="btn-expand"
                            onClick={() => toggleVoterMetadata(voter.id)}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        ) : (
                          <span className="no-metadata">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                  {showMetadata && isExpanded && voter.metadata && (
                    <tr className="metadata-row">
                      <td colSpan={6}>
                        <div className="metadata-content">
                          <strong>Raw Data:</strong> {voter.metadata}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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

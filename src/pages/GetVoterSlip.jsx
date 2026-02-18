import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function GetVoterSlip() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedVoter, setSelectedVoter] = useState(null)
  const [viewMode, setViewMode] = useState('slip') // 'slip', 'photo', 'qr'

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    const debounce = setTimeout(() => {
      searchVoters(searchQuery.trim())
    }, 450)

    return () => clearTimeout(debounce)
  }, [searchQuery])

  const searchVoters = async (query) => {
    setLoading(true)
    try {
      // Clean query for phone search
      const cleanPhone = query.replace(/[\s\-\+]/g, '').replace(/^91/, '')

      // Build search conditions
      let supabaseQuery = supabase
        .from('voters')
        .select('*')
        .limit(20)

      // Check if query looks like a phone number
      if (/^\d{7,10}$/.test(cleanPhone)) {
        supabaseQuery = supabaseQuery.ilike('contact', `%${cleanPhone}%`)
      }
      // Check if query looks like registration number (contains D/)
      else if (query.toUpperCase().includes('D/')) {
        supabaseQuery = supabaseQuery.ilike('metadata', `%${query}%`)
      }
      // Otherwise search by name
      else {
        supabaseQuery = supabaseQuery.ilike('full_name', `%${query}%`)
      }

      const { data, error } = await supabaseQuery

      if (error) throw error
      setResults(data || [])
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const parseMetadata = (metadata) => {
    try {
      return JSON.parse(metadata)
    } catch {
      return {}
    }
  }

  const handleViewDetails = (voter) => {
    setSelectedVoter(voter)
    setViewMode('slip')
  }

  const handleViewPhoto = (voter) => {
    setSelectedVoter(voter)
    setViewMode('photo')
  }

  const handleViewQR = (voter) => {
    setSelectedVoter(voter)
    setViewMode('qr')
  }

  const closeModal = () => {
    setSelectedVoter(null)
    setViewMode('slip')
  }

  const generateSlipHTML = (voter) => {
    const meta = parseMetadata(voter.metadata)
    const stampImageUrl = `${window.location.origin}/stamp.png`
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Voter Slip - ${voter.full_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .slip { max-width: 450px; margin: 0 auto; background: #fff; border: 1px solid #000; }
    .top-row { display: flex; align-items: center; border-bottom: 1px solid #000; }
    .serial { min-width: 40px; padding: 6px 8px; font-size: 0.8rem; font-weight: 700; text-align: center; }
    .name { flex: 1; padding: 6px 10px; font-size: 0.8rem; font-weight: 700; }
    .registration { padding: 6px 10px; font-size: 0.75rem; font-weight: 600; }
    .main-row { display: flex; align-items: flex-start; }
    .qr-section { width: 116px; padding: 8px; }
    .qr-section img { width: 106px; height: 106px; object-fit: contain; }
    .info-section { flex: 1; padding: 8px 10px; }
    .info-section p { font-size: 0.7rem; color: #000; line-height: 1.4; margin-bottom: 4px; }
    .info-section span { font-weight: 600; }
    .stamp { width: 110px; height: auto; object-fit: contain; margin-top: 6px; }
    .photo-section { width: 107px; padding: 8px; }
    .photo-section img { width: 97px; height: 119px; object-fit: cover; border: 1px solid #000; }
    .vote-appeal { background: #1e293b; color: white; padding: 5px 10px; text-align: center; border-top: 1px solid #000; }
    .vote-appeal p { font-size: 0.65rem; }
    .vote-appeal strong { color: #fbbf24; }
    @media print { body { padding: 0; background: #fff; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="top-row">
      <div class="serial">${meta.serial || '—'}</div>
      <div class="name">${voter.full_name}</div>
      <div class="registration">${meta.registration || 'N/A'}</div>
    </div>
    <div class="main-row">
      <div class="qr-section">
        ${voter.qr_code_url ? `<img src="${voter.qr_code_url}" alt="QR">` : '<div style="width:106px;height:106px;background:#f5f5f5;border:1px dashed #ccc;"></div>'}
      </div>
      <div class="info-section">
        <p><span>Contact:</span> ${voter.contact || 'N/A'}</p>
        <p><span>Address:</span> ${voter.address || 'N/A'}</p>
        <img src="${stampImageUrl}" alt="Stamp" class="stamp">
      </div>
      <div class="photo-section">
        ${voter.photo_url ? `<img src="${voter.photo_url}" alt="Photo">` : '<div style="width:97px;height:119px;background:#f5f5f5;border:1px dashed #ccc;"></div>'}
      </div>
    </div>
    <div class="vote-appeal">
      <p>Vote for <strong>DEV RAJ SHARMA</strong> — Ballot No. <strong>63</strong></p>
    </div>
  </div>
  <p style="text-align:center;margin-top:20px;color:#666;font-size:11px;">Press Ctrl+P to print or save as PDF</p>
</body>
</html>`
  }

  const handleDownloadSlip = (voter) => {
    const html = generateSlipHTML(voter)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voter-slip-${voter.full_name.replace(/\s+/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShareWhatsApp = (voter) => {
    const meta = parseMetadata(voter.metadata)
    const message = `*BCD Election 2026 - Voter Slip*

Name: ${voter.full_name}
Registration: ${meta.registration || 'N/A'}
Contact: ${voter.contact || 'N/A'}

*Vote for: DEV RAJ SHARMA*
*Ballot No. 63*

Get your voter slip: ${window.location.href}`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div className="voter-slip-page">
      {/* Left Panel - Candidate Hero */}
      <div className="candidate-hero-panel">
        <div className="hero-content">
          <div className="hero-badge">BCD Election 2026</div>
          <div className="candidate-photo-wrapper">
            <div className="photo-ring"></div>
            <div className="photo-ring ring-2"></div>
            <img src="/profile.png" alt="Dev Raj Sharma" className="candidate-photo" />
          </div>
          <div className="candidate-details">
            <h1 className="candidate-name">DEV RAJ SHARMA</h1>
            <div className="ballot-badge">
              <span className="ballot-label">Ballot No.</span>
              <span className="ballot-num">63</span>
            </div>
          </div>
          <div className="hero-tagline">
            <p>Your vote matters. Find your details and exercise your right.</p>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="deco-circle deco-1"></div>
          <div className="deco-circle deco-2"></div>
          <div className="deco-circle deco-3"></div>
        </div>
      </div>

      {/* Right Panel - Search */}
      <div className="search-panel">
        <div className="search-panel-content">
          <div className="search-header">
            <h2>Get Your Voter Slip</h2>
            <p>Search the electoral roll to find and download your voter slip</p>
          </div>

          <div className="search-box">
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, phone, or registration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="search-tags">
              <span className="search-tag" onClick={() => setSearchQuery('9810027994')}>Phone</span>
              <span className="search-tag" onClick={() => setSearchQuery('Rajinder')}>Name</span>
              <span className="search-tag" onClick={() => setSearchQuery('D/46/1958')}>Registration</span>
            </div>
          </div>

        {loading && (
          <div className="search-loading">
            <div className="spinner-small"></div>
            <span>Searching...</span>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="search-results">
            <p className="results-count">{results.length} result(s) found</p>
            <div className="results-list">
              {results.map((voter) => {
                const meta = parseMetadata(voter.metadata)
                return (
                  <div key={voter.id} className="result-card">
                    {voter.photo_url && (
                      <div className="result-photo">
                        <img
                          src={voter.photo_url}
                          alt=""
                          onError={(e) => { e.target.parentElement.style.display = 'none' }}
                        />
                      </div>
                    )}
                    <div className="result-info">
                      <h3>{voter.full_name}</h3>
                      <p className="result-registration">{meta.registration || 'N/A'}</p>
                      <p className="result-contact">{voter.contact || 'No contact'}</p>
                    </div>
                    <div className="result-actions">
                      {voter.photo_url && (
                        <button
                          className="btn-view-photo"
                          onClick={() => handleViewPhoto(voter)}
                          title="View Photo"
                        >
                          Photo
                        </button>
                      )}
                      {voter.qr_code_url && (
                        <button
                          className="btn-view-qr"
                          onClick={() => handleViewQR(voter)}
                          title="View QR Code"
                        >
                          QR
                        </button>
                      )}
                      <button
                        className="btn-view-details"
                        onClick={() => handleViewDetails(voter)}
                      >
                        View Slip
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && searchQuery.length >= 2 && results.length === 0 && (
          <div className="no-results">
            <p>No voters found matching "{searchQuery}"</p>
            <p className="no-results-hint">Try searching with a different name, phone number, or registration.</p>
          </div>
        )}

        </div>

        <div className="electoral-source-footer">
          Electoral Roll data sourced from official website of Bar Council of Delhi:{' '}
          <a href="https://delhibarcouncil.com/final_voter_list.php" target="_blank" rel="noopener noreferrer">
            delhibarcouncil.com
          </a>
        </div>
      </div>

      {/* Voter Details Modal */}
      {selectedVoter && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal-content ${viewMode === 'slip' ? 'slip-modal' : 'media-modal'}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>

            {/* View Mode Tabs */}
            <div className="modal-tabs">
              <button
                className={`modal-tab ${viewMode === 'slip' ? 'active' : ''}`}
                onClick={() => setViewMode('slip')}
              >
                Full Slip
              </button>
              {selectedVoter.photo_url && (
                <button
                  className={`modal-tab ${viewMode === 'photo' ? 'active' : ''}`}
                  onClick={() => setViewMode('photo')}
                >
                  Photo
                </button>
              )}
              {selectedVoter.qr_code_url && (
                <button
                  className={`modal-tab ${viewMode === 'qr' ? 'active' : ''}`}
                  onClick={() => setViewMode('qr')}
                >
                  QR Code
                </button>
              )}
            </div>

            {/* Photo View */}
            {viewMode === 'photo' && (
              <div className="media-view photo-view">
                <div className="media-header">
                  <h3>{selectedVoter.full_name}</h3>
                  <p>{parseMetadata(selectedVoter.metadata).registration || 'N/A'}</p>
                </div>
                <div className="media-content">
                  {selectedVoter.photo_url ? (
                    <img
                      src={selectedVoter.photo_url}
                      alt={selectedVoter.full_name}
                      className="large-photo"
                    />
                  ) : (
                    <div className="no-media">No photo available</div>
                  )}
                </div>
                <div className="media-candidate-footer">
                  <img src="/profile.png" alt="Dev Raj Sharma" />
                  <div>
                    <p>Vote for <strong>DEV RAJ SHARMA</strong></p>
                    <p className="ballot-text">Ballot No. 63</p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code View */}
            {viewMode === 'qr' && (
              <div className="media-view qr-view">
                <div className="media-header">
                  <h3>{selectedVoter.full_name}</h3>
                  <p>{parseMetadata(selectedVoter.metadata).registration || 'N/A'}</p>
                </div>
                <div className="media-content">
                  {selectedVoter.qr_code_url ? (
                    <img
                      src={selectedVoter.qr_code_url}
                      alt="QR Code"
                      className="large-qr"
                    />
                  ) : (
                    <div className="no-media">No QR code available</div>
                  )}
                </div>
                <div className="media-candidate-footer">
                  <img src="/profile.png" alt="Dev Raj Sharma" />
                  <div>
                    <p>Vote for <strong>DEV RAJ SHARMA</strong></p>
                    <p className="ballot-text">Ballot No. 63</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full Slip View */}
            {viewMode === 'slip' && (
              <>
                <div className="voter-slip-card-new">
                  {/* Top Row: Serial | Name | Registration */}
                  <div className="slip-top-row">
                    <div className="slip-serial">
                      {parseMetadata(selectedVoter.metadata).serial || '—'}
                    </div>
                    <div className="slip-name">
                      {selectedVoter.full_name}
                    </div>
                    <div className="slip-registration">
                      {parseMetadata(selectedVoter.metadata).registration || 'N/A'}
                    </div>
                  </div>

                  {/* Main Content: QR | Info | Photo - like PDF cell */}
                  <div className="slip-main-row">
                    <div className="slip-qr-section">
                      {selectedVoter.qr_code_url ? (
                        <img
                          src={selectedVoter.qr_code_url}
                          alt="QR Code"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="slip-qr-placeholder"></div>
                      )}
                    </div>

                    <div className="slip-info-section">
                      <p><span>Contact:</span> {selectedVoter.contact || 'N/A'}</p>
                      <p><span>Address:</span> {selectedVoter.address || 'N/A'}</p>
                      <img src="/stamp.png" alt="Stamp" className="slip-stamp" />
                    </div>

                    <div className="slip-photo-section">
                      {selectedVoter.photo_url ? (
                        <img
                          src={selectedVoter.photo_url}
                          alt={selectedVoter.full_name}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="slip-photo-placeholder"></div>
                      )}
                    </div>
                  </div>

                  {/* Vote Appeal - Compact text only */}
                  <div className="slip-vote-appeal">
                    <p>Vote for <strong>DEV RAJ SHARMA</strong> — Ballot No. <strong>63</strong></p>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    className="btn-download"
                    onClick={() => handleDownloadSlip(selectedVoter)}
                  >
                    Download Slip
                  </button>
                  <button
                    className="btn-whatsapp"
                    onClick={() => handleShareWhatsApp(selectedVoter)}
                  >
                    Share on WhatsApp
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

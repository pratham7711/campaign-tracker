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

  // Convert image URL to base64
  const imageToBase64 = async (url) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (err) {
      console.error('Failed to convert image:', err)
      return null
    }
  }

  const generateSlipHTML = async (voter) => {
    const meta = parseMetadata(voter.metadata)

    // Convert all images to base64 for offline viewing
    const [stampBase64, photoBase64, qrBase64, profileBase64] = await Promise.all([
      imageToBase64('/stamp.png'),
      voter.photo_url ? imageToBase64(voter.photo_url) : Promise.resolve(null),
      voter.qr_code_url ? imageToBase64(voter.qr_code_url) : Promise.resolve(null),
      imageToBase64('/profile.png')
    ])

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Voter Slip - ${voter.full_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { max-width: 480px; width: 100%; }

    /* Slip Card */
    .slip {
      border: 1px solid #000;
      background: #fff;
    }
    .top-row {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #000;
    }
    .serial {
      min-width: 40px;
      padding: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      text-align: center;
      border-right: 1px solid #000;
    }
    .name {
      flex: 1;
      padding: 8px 10px;
      font-size: 0.85rem;
      font-weight: 700;
    }
    .registration {
      padding: 8px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #333;
      border-left: 1px solid #000;
    }
    .main-row {
      display: flex;
      align-items: flex-start;
    }
    .qr-section {
      width: 115px;
      padding: 10px;
      border-right: 1px solid #ddd;
    }
    .qr-section img {
      width: 95px;
      height: 95px;
      object-fit: contain;
    }
    .qr-placeholder {
      width: 95px;
      height: 95px;
      background: #f5f5f5;
      border: 1px dashed #ccc;
    }
    .info-section {
      flex: 1;
      padding: 10px;
    }
    .info-section p {
      font-size: 0.7rem;
      color: #000;
      line-height: 1.4;
      margin-bottom: 4px;
    }
    .info-section span {
      font-weight: 600;
    }
    .stamp {
      width: 85px;
      height: auto;
      margin-top: 6px;
    }
    .photo-section {
      width: 105px;
      padding: 10px;
      border-left: 1px solid #ddd;
    }
    .photo-section img {
      width: 85px;
      height: 105px;
      object-fit: cover;
      border: 1px solid #000;
    }
    .photo-placeholder {
      width: 85px;
      height: 105px;
      background: #f5f5f5;
      border: 1px dashed #ccc;
    }

    /* Vote Appeal */
    .vote-appeal {
      background: #1e293b;
      color: #fff;
      padding: 8px 12px;
      text-align: center;
      font-size: 0.7rem;
    }
    .vote-appeal strong {
      color: #fbbf24;
    }

    /* Promotion Section */
    .promotion {
      margin-top: 20px;
      padding: 16px;
      border: 1px solid #ddd;
      background: #fafafa;
      text-align: center;
    }
    .promotion-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 12px;
    }
    .promotion-header img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #1e293b;
    }
    .promotion-header-text h3 {
      font-size: 1rem;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .promotion-header-text .ballot {
      display: inline-block;
      background: #fbbf24;
      color: #1e293b;
      padding: 3px 10px;
      font-weight: 700;
      font-size: 0.75rem;
      border-radius: 3px;
    }
    .promotion-message {
      font-size: 0.75rem;
      color: #444;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    .promotion-tagline {
      font-size: 0.8rem;
      font-weight: 600;
      color: #1e293b;
      font-style: italic;
    }
    .promotion-election {
      margin-top: 10px;
      font-size: 0.7rem;
      color: #666;
    }

    /* Footer */
    .footer {
      margin-top: 16px;
      text-align: center;
      font-size: 0.65rem;
      color: #999;
    }

    @media print {
      body { padding: 10px; min-height: auto; }
      .footer { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Voter Slip -->
    <div class="slip">
      <div class="top-row">
        <div class="serial">${meta.serial || '—'}</div>
        <div class="name">${voter.full_name}</div>
        <div class="registration">${meta.registration || 'N/A'}</div>
      </div>
      <div class="main-row">
        <div class="qr-section">
          ${qrBase64 ? `<img src="${qrBase64}" alt="QR">` : '<div class="qr-placeholder"></div>'}
        </div>
        <div class="info-section">
          <p><span>Contact:</span> ${voter.contact || 'N/A'}</p>
          <p><span>Address:</span> ${voter.address || 'N/A'}</p>
          ${stampBase64 ? `<img src="${stampBase64}" alt="Stamp" class="stamp">` : ''}
        </div>
        <div class="photo-section">
          ${photoBase64 ? `<img src="${photoBase64}" alt="Photo">` : '<div class="photo-placeholder"></div>'}
        </div>
      </div>
      <div class="vote-appeal">
        Vote for <strong>DEV RAJ SHARMA</strong> — Ballot No. <strong>63</strong>
      </div>
    </div>

    <!-- Promotion Section -->
    <div class="promotion">
      <div class="promotion-header">
        ${profileBase64 ? `<img src="${profileBase64}" alt="Dev Raj Sharma">` : ''}
        <div class="promotion-header-text">
          <h3>DEV RAJ SHARMA</h3>
          <span class="ballot">Ballot No. 63</span>
        </div>
      </div>
      <p class="promotion-message">
        With years of dedicated service to the legal community, Dev Raj Sharma is committed to transparency,
        member welfare, and the professional growth of all advocates.
      </p>
      <p class="promotion-tagline">"Your Voice, Your Vote, Your Future"</p>
      <p class="promotion-election">Bar Council of Delhi Election 2026</p>
    </div>

    <div class="footer">
      Press Ctrl+P to print or save as PDF
    </div>
  </div>
</body>
</html>`
  }

  const handleDownloadSlip = async (voter) => {
    // Show loading state
    const button = document.querySelector('.btn-download')
    const originalText = button?.textContent
    if (button) {
      button.textContent = 'Preparing...'
      button.disabled = true
    }

    try {
      const html = await generateSlipHTML(voter)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `voter-slip-${voter.full_name.replace(/\s+/g, '-')}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download slip. Please try again.')
    } finally {
      if (button) {
        button.textContent = originalText
        button.disabled = false
      }
    }
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

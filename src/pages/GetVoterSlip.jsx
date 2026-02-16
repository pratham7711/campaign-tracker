import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function GetVoterSlip() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedVoter, setSelectedVoter] = useState(null)

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
  }

  const closeModal = () => {
    setSelectedVoter(null)
  }

  const generateSlipHTML = (voter) => {
    const meta = parseMetadata(voter.metadata)
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Voter Slip - ${voter.full_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .slip { max-width: 550px; margin: 0 auto; background: #fff; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .top-row { display: flex; align-items: stretch; border-bottom: 2px solid #e5e7eb; background: #f8fafc; }
    .serial { width: 50px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700; color: #dc2626; border-right: 2px solid #e5e7eb; padding: 12px; }
    .name { flex: 1; padding: 12px 16px; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
    .registration { padding: 12px 16px; font-size: 1rem; font-weight: 600; color: #2563eb; border-left: 2px solid #e5e7eb; background: #eff6ff; }
    .main-row { display: flex; align-items: stretch; min-height: 120px; }
    .qr-section { width: 100px; padding: 12px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #e5e7eb; }
    .qr-section img { width: 85px; height: 85px; object-fit: contain; }
    .info-section { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
    .info-section p { font-size: 0.9rem; color: #374151; line-height: 1.4; }
    .info-section strong { color: #1f2937; }
    .photo-section { width: 90px; padding: 12px; display: flex; align-items: center; justify-content: center; border-left: 1px solid #e5e7eb; }
    .photo-section img { width: 71px; height: 89px; object-fit: cover; border-radius: 4px; border: 1px solid #d1d5db; }
    .vote-appeal { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 12px 16px; text-align: center; font-size: 0.95rem; }
    .vote-appeal strong { color: #fbbf24; }
    @media print { body { padding: 0; background: #fff; } .slip { border: 1px solid #000; } }
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
        ${voter.qr_code_url ? `<img src="${voter.qr_code_url}" alt="QR">` : '<div style="width:85px;height:85px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:4px;"></div>'}
      </div>
      <div class="info-section">
        <p><strong>Contact:</strong> ${voter.contact || 'N/A'}</p>
        <p><strong>Address:</strong> ${voter.address || 'N/A'}</p>
      </div>
      <div class="photo-section">
        ${voter.photo_url ? `<img src="${voter.photo_url}" alt="Photo">` : '<div style="width:71px;height:89px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:4px;"></div>'}
      </div>
    </div>
    <div class="vote-appeal">
      <p>Vote for: <strong>DEV RAJ SHARMA</strong> — Ballot No. <strong>63</strong></p>
    </div>
  </div>
  <p style="text-align:center;margin-top:20px;color:#666;font-size:12px;">Press Ctrl+P to print or save as PDF</p>
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
      <div className="voter-slip-container">
        <div className="candidate-banner">
          <div className="candidate-info">
            <h2>DEV RAJ SHARMA</h2>
            <p className="candidate-designation">Advocate, Supreme Court of India</p>
            <p className="ballot-number">Ballot No. 63</p>
          </div>
        </div>

        <h1>Get Your Voter Slip</h1>
        <p className="slip-subtitle">BCD Election 2026 - Electoral Roll Lookup</p>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, phone, or registration (D/...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <p className="search-hints">
            Try: Phone (9810027994), Name (Rajinder), Registration (D/46/1958)
          </p>
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
                    <button
                      className="btn-view-details"
                      onClick={() => handleViewDetails(voter)}
                    >
                      View Slip
                    </button>
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

        <Link to="/" className="btn-back">
          Back to Dashboard
        </Link>
      </div>

      {/* Voter Details Modal */}
      {selectedVoter && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content slip-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>

            {/* Voter Slip Card - Matching PDF Layout */}
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

              {/* Main Content: QR | Info | Photo */}
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
                  <p><strong>Contact:</strong> {selectedVoter.contact || 'N/A'}</p>
                  <p><strong>Address:</strong> {selectedVoter.address || 'N/A'}</p>
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

              {/* Vote Appeal */}
              <div className="slip-vote-appeal">
                <p>Vote for: <strong>DEV RAJ SHARMA</strong> — Ballot No. <strong>63</strong></p>
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
          </div>
        </div>
      )}
    </div>
  )
}

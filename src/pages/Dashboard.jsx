import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import VoterFilter from '../components/VoterFilter'
import VoterList from '../components/VoterList'
import votersData from '../data/voters.json'

export default function Dashboard({ user }) {
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    pincode: '',
    address: '',
  })
  const [calledVoters, setCalledVoters] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Load user's called voters and ensure profile exists
  useEffect(() => {
    ensureProfileExists()
    loadCalledVoters()
  }, [user])

  const ensureProfileExists = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        await supabase
          .from('user_profiles')
          .insert([{ id: user.id, display_name: user.email.split('@')[0] }])
      }
    } catch (err) {
      // Profile doesn't exist, create it
      await supabase
        .from('user_profiles')
        .insert([{ id: user.id, display_name: user.email.split('@')[0] }])
        .catch(() => {}) // Ignore if already exists
    }
  }

  const loadCalledVoters = async () => {
    try {
      const { data, error } = await supabase
        .from('call_records')
        .select('voter_id')
        .eq('user_id', user.id)

      if (error) throw error

      const calledIds = new Set(data.map((record) => record.voter_id))
      setCalledVoters(calledIds)
    } catch (err) {
      console.error('Error loading called voters:', err)
    } finally {
      setInitialLoading(false)
    }
  }

  // Filter voters based on current filters
  const filteredVoters = useMemo(() => {
    const hasFilters =
      filters.firstName || filters.lastName || filters.pincode || filters.address

    if (!hasFilters) {
      return [] // Don't show any voters until filters are applied
    }

    return votersData.filter((voter) => {
      const firstNameMatch =
        !filters.firstName ||
        voter.firstName?.toUpperCase().includes(filters.firstName.toUpperCase())

      const lastNameMatch =
        !filters.lastName ||
        voter.lastName?.toUpperCase().includes(filters.lastName.toUpperCase())

      const pincodeMatch =
        !filters.pincode || voter.pincode?.includes(filters.pincode)

      const addressMatch =
        !filters.address ||
        voter.address?.toUpperCase().includes(filters.address.toUpperCase())

      return firstNameMatch && lastNameMatch && pincodeMatch && addressMatch
    })
  }, [filters])

  const handleFilter = (newFilters) => {
    setFilters(newFilters)
  }

  const handleToggleCall = async (voterId) => {
    setLoading(true)
    const isCalled = calledVoters.has(voterId)

    try {
      if (isCalled) {
        // Remove call record
        const { error } = await supabase
          .from('call_records')
          .delete()
          .eq('user_id', user.id)
          .eq('voter_id', voterId)

        if (error) throw error

        setCalledVoters((prev) => {
          const next = new Set(prev)
          next.delete(voterId)
          return next
        })
      } else {
        // Add call record
        const { error } = await supabase.from('call_records').insert([
          {
            user_id: user.id,
            voter_id: voterId,
          },
        ])

        if (error) throw error

        setCalledVoters((prev) => new Set([...prev, voterId]))
      }
    } catch (err) {
      console.error('Error toggling call:', err)
      alert('Failed to update call status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your data...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Navbar user={user} callCount={calledVoters.size} />

      <main className="dashboard-content">
        <VoterFilter onFilter={handleFilter} totalVoters={votersData.length} />

        {filters.firstName || filters.lastName || filters.pincode || filters.address ? (
          <VoterList
            voters={filteredVoters}
            calledVoters={calledVoters}
            onToggleCall={handleToggleCall}
            loading={loading}
          />
        ) : (
          <div className="no-filter-message">
            <p>Enter at least one filter to search for voters.</p>
          </div>
        )}
      </main>
    </div>
  )
}

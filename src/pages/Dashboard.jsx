import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import VoterFilter from '../components/VoterFilter'
import VoterList from '../components/VoterList'

export default function Dashboard({ user, onLogout }) {
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    pincode: '',
    address: '',
  })
  const [voters, setVoters] = useState([])
  const [totalVoters, setTotalVoters] = useState(0)
  const [calledVoters, setCalledVoters] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Load initial data
  useEffect(() => {
    ensureProfileExists()
    loadCalledVoters()
    loadTotalVoters()
  }, [user])

  const ensureProfileExists = async () => {
    try {
      // Check if guest profile exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Create guest profile
        await supabase
          .from('user_profiles')
          .insert([{ id: user.id, display_name: user.displayName }])
      }
    } catch (err) {
      // Try to create profile if not exists
      await supabase
        .from('user_profiles')
        .insert([{ id: user.id, display_name: user.displayName }])
        .catch(() => {})
    }
  }

  const loadTotalVoters = async () => {
    try {
      const { count } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true })
      setTotalVoters(count || 0)
    } catch (err) {
      console.error('Error loading total voters:', err)
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

  // Search voters from database
  const searchVoters = async (searchFilters) => {
    const hasFilters =
      searchFilters.firstName || searchFilters.lastName ||
      searchFilters.pincode || searchFilters.address

    if (!hasFilters) {
      setVoters([])
      return
    }

    setSearchLoading(true)
    try {
      let query = supabase.from('voters').select('*')

      if (searchFilters.firstName) {
        query = query.ilike('first_name', `%${searchFilters.firstName}%`)
      }
      if (searchFilters.lastName) {
        query = query.ilike('last_name', `%${searchFilters.lastName}%`)
      }
      if (searchFilters.pincode) {
        query = query.ilike('pincode', `%${searchFilters.pincode}%`)
      }
      if (searchFilters.address) {
        query = query.ilike('address', `%${searchFilters.address}%`)
      }

      // No limit - fetch all matching results
      const { data, error } = await query

      if (error) throw error

      // Transform to match expected format
      const formattedVoters = data.map(v => ({
        id: v.id,
        firstName: v.first_name,
        lastName: v.last_name,
        fullName: v.full_name,
        contact: v.contact,
        address: v.address,
        pincode: v.pincode,
        city: v.city
      }))

      setVoters(formattedVoters)
    } catch (err) {
      console.error('Error searching voters:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleFilter = (newFilters) => {
    setFilters(newFilters)
    searchVoters(newFilters)
  }

  const handleToggleCall = async (voterId) => {
    setLoading(true)
    const isCalled = calledVoters.has(voterId)

    try {
      if (isCalled) {
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

  const hasFilters = filters.firstName || filters.lastName || filters.pincode || filters.address

  return (
    <div className="dashboard">
      <Navbar user={user} callCount={calledVoters.size} onLogout={onLogout} />

      <main className="dashboard-content">
        <VoterFilter onFilter={handleFilter} totalVoters={totalVoters} />

        {searchLoading ? (
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Searching voters...</p>
          </div>
        ) : hasFilters ? (
          <VoterList
            voters={voters}
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

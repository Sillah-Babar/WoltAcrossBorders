import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './SettingsModal.css'

function SettingsModal({ user, onClose }) {
  const [street, setStreet] = useState('')
  const [house, setHouse] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Load user's current location data
    if (user) {
      loadUserLocation()
    }
  }, [user])

  const loadUserLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('street, house, city, country')
        .eq('email', user.email)
        .single()

      if (error) throw error

      if (data) {
        setStreet(data.street || '')
        setHouse(data.house || '')
        setCity(data.city || '')
        setCountry(data.country || '')
      }
    } catch (err) {
      console.error('Error loading user location:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!user || !user.email) {
        throw new Error('User not found')
      }

      // Update user location in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          street: street || null,
          house: house || null,
          city: city || null,
          country: country || null,
          updated_at: new Date().toISOString(),
        })
        .eq('email', user.email)

      if (updateError) throw updateError

      setSuccess('Location updated successfully!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'An error occurred while updating location')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="settings-modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="settings-modal-content">
          <h2 className="settings-modal-title">Settings</h2>
          <h3 className="settings-section-title">Location</h3>
          
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="settings-form-group">
              <label htmlFor="street">Street</label>
              <input
                id="street"
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Enter street name"
                disabled={loading}
              />
            </div>
            
            <div className="settings-form-group">
              <label htmlFor="house">House Number</label>
              <input
                id="house"
                type="text"
                value={house}
                onChange={(e) => setHouse(e.target.value)}
                placeholder="Enter house number"
                disabled={loading}
              />
            </div>
            
            <div className="settings-form-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city"
                disabled={loading}
              />
            </div>
            
            <div className="settings-form-group">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Enter country"
                disabled={loading}
              />
            </div>
            
            {error && <div className="settings-error">{error}</div>}
            {success && <div className="settings-success">{success}</div>}
            
            <button 
              type="submit" 
              className="settings-submit-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Location'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal


import React, { useState, useEffect } from 'react'
import RestaurantCard from './RestaurantCard'
import { supabase } from '../lib/supabase'
import './AllRestaurants.css'

function AllRestaurants({ onRestaurantClick }) {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      setRestaurants(data || [])
    } catch (err) {
      console.error('Error fetching restaurants:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="all-restaurants">
        <h2 className="section-title">All restaurants</h2>
        <div className="loading-message">Loading restaurants...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="all-restaurants">
        <h2 className="section-title">All restaurants</h2>
        <div className="error-message">Error loading restaurants: {error}</div>
      </div>
    )
  }

  return (
    <div className="all-restaurants">
      <h2 className="section-title">All restaurants</h2>
      <div className="restaurants-grid">
        {restaurants.map(restaurant => (
          <RestaurantCard 
            key={restaurant.id} 
            restaurant={restaurant}
            onClick={() => onRestaurantClick && onRestaurantClick(restaurant)}
          />
        ))}
      </div>
    </div>
  )
}

export default AllRestaurants


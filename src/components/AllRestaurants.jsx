import React from 'react'
import RestaurantCard from './RestaurantCard'
import restaurantsData from '../data/restaurants.json'
import './AllRestaurants.css'

function AllRestaurants() {
  return (
    <div className="all-restaurants">
      <h2 className="section-title">All restaurants</h2>
      <div className="restaurants-grid">
        {restaurantsData.map(restaurant => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </div>
  )
}

export default AllRestaurants


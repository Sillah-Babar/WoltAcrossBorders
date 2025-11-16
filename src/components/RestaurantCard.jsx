import React from 'react'
import './RestaurantCard.css'

function RestaurantCard({ restaurant, onClick }) {
  const formatRating = (rating) => {
    return rating ? rating.toFixed(1) : 'N/A'
  }

  const formatDistance = (distance) => {
    if (!distance) return ''
    return `${distance} km`
  }

  // Get a random restaurant image based on restaurant ID and name
  const getRandomRestaurantImage = (restaurant) => {
    // Create a hash from restaurant ID and name for consistent randomization
    const hash = (restaurant.id || 0) + (restaurant.name || '').split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    // Use hash to get a random index between 1-3
    const randomIndex = (Math.abs(hash) % 3) + 1
    return `/random_restaurants/restaurant${randomIndex}.png`
  }

  return (
    <div className="restaurant-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="restaurant-image-container">
        <div className="restaurant-image">
          <img 
            src={getRandomRestaurantImage(restaurant)} 
            alt={restaurant.name}
            className="restaurant-image-img"
            onError={(e) => {
              // Hide image and show emoji fallback
              e.target.style.display = 'none'
              if (!e.target.nextSibling) {
                const emojiDiv = document.createElement('div')
                emojiDiv.className = 'restaurant-emoji'
                emojiDiv.textContent = '🍽️'
                e.target.parentElement.appendChild(emojiDiv)
              }
            }}
          />
        </div>
        {restaurant.status && restaurant.status !== 'open' && (
          <div className="restaurant-badge">{restaurant.status}</div>
        )}
      </div>
      <div className="restaurant-info">
        <div className="restaurant-name-row">
          <h3 className="restaurant-name">{restaurant.name}</h3>
        </div>
        <p className="restaurant-description">
          {restaurant.description || 'Delicious food awaits'}
        </p>
        <div className="restaurant-footer">
          {restaurant.delivery_time && (
            <>
              <span className="delivery-time">{restaurant.delivery_time}</span>
              <span className="separator">•</span>
            </>
          )}
          {restaurant.distance && (
            <>
              <span className="shipping">{formatDistance(restaurant.distance)}</span>
              <span className="separator">•</span>
            </>
          )}
          {restaurant.rating && (
            <span className="rating">{formatRating(restaurant.rating)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RestaurantCard


import React from 'react'
import './RestaurantCard.css'

function RestaurantCard({ restaurant }) {
  return (
    <div className="restaurant-card">
      <div className="restaurant-image-container">
        <div className="restaurant-image">
          <div className="restaurant-emoji">{restaurant.image}</div>
        </div>
        {restaurant.badge && (
          <div className="restaurant-badge">{restaurant.badge}</div>
        )}
      </div>
      <div className="restaurant-info">
        <div className="restaurant-name-row">
          <h3 className="restaurant-name">{restaurant.name}</h3>
          {restaurant.wPlus && (
            <span className="w-plus-badge">w+</span>
          )}
        </div>
        <p className="restaurant-description">{restaurant.description}</p>
        <div className="restaurant-footer">
          <span className="delivery-time">{restaurant.deliveryTime}</span>
          <span className="separator">•</span>
          <span className="shipping">{restaurant.shipping}</span>
          <span className="separator">•</span>
          <span className="rating">{restaurant.rating}</span>
        </div>
      </div>
    </div>
  )
}

export default RestaurantCard


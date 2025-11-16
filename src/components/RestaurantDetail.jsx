import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './RestaurantDetail.css'

function RestaurantDetail({ restaurant, onClose, cart, setCart, showCart, setShowCart }) {
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (restaurant) {
      fetchDishes()
    }
  }, [restaurant])

  const fetchDishes = async () => {
    try {
      setLoading(true)
      // First, get menu_items for this restaurant
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (menuError) throw menuError

      if (!menuItems || menuItems.length === 0) {
        setDishes([])
        setLoading(false)
        return
      }

      // Get unique dish names from menu_items
      const dishNames = menuItems.map(item => item.name).filter(Boolean)
      
      if (dishNames.length === 0) {
        setDishes([])
        setLoading(false)
        return
      }

      // Join with unique_dishes based on name to get images
      const { data: uniqueDishes, error: dishesError } = await supabase
        .from('unique_dishes')
        .select('*')
        .in('name', dishNames)

      if (dishesError) throw dishesError

      // Merge menu_items with unique_dishes data based on name
      const dishesWithImages = menuItems.map(menuItem => {
        const uniqueDish = uniqueDishes?.find(ud => ud.name === menuItem.name)
        return {
          ...menuItem,
          // Add image data from unique_dishes if found
          gcp_public_url: uniqueDish?.gcp_public_url || null,
          gcp_image_url: uniqueDish?.gcp_image_url || null,
          gcp_bucket: uniqueDish?.gcp_bucket || null,
          gcp_path: uniqueDish?.gcp_path || null,
          image_hash: uniqueDish?.image_hash || null,
        }
      })

      setDishes(dishesWithImages)
    } catch (err) {
      console.error('Error fetching dishes:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Get a random default food image
  const getRandomDefaultImage = (dish) => {
    const hash = (dish.id || 0) + (dish.name || '').split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    const randomIndex = (Math.abs(hash) % 4) + 1
    return `/random_food/food${randomIndex}.png`
  }

  const getImageUrl = (dish) => {
    if (dish.gcp_public_url) {
      return dish.gcp_public_url
    }
    
    if (dish.gcp_image_url) {
      if (dish.gcp_image_url.startsWith('http://') || dish.gcp_image_url.startsWith('https://')) {
        return dish.gcp_image_url
      }
      if (dish.gcp_bucket && dish.gcp_path) {
        return `https://storage.googleapis.com/${dish.gcp_bucket}/${dish.gcp_path}`
      }
      if (dish.gcp_bucket && dish.gcp_image_url) {
        return `https://storage.googleapis.com/${dish.gcp_bucket}/${dish.gcp_image_url}`
      }
    }
    
    if (dish.gcp_bucket && dish.gcp_path) {
      return `https://storage.googleapis.com/${dish.gcp_bucket}/${dish.gcp_path}`
    }
    
    return getRandomDefaultImage(dish)
  }

  // Group dishes by category
  const groupDishesByCategory = () => {
    const grouped = {}
    dishes.forEach(dish => {
      const category = dish.category || 'Other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(dish)
    })
    return grouped
  }

  // Cart functions
  const addToCart = (dish) => {
    setCart(prev => {
      const existingItem = prev[dish.id]
      return {
        ...prev,
        [dish.id]: {
          quantity: (existingItem?.quantity || 0) + 1,
          dish: dish // Store the full dish object
        }
      }
    })
  }

  const removeFromCart = (dishId) => {
    setCart(prev => {
      const newCart = { ...prev }
      if (newCart[dishId]?.quantity > 1) {
        newCart[dishId] = {
          ...newCart[dishId],
          quantity: newCart[dishId].quantity - 1
        }
      } else {
        delete newCart[dishId]
      }
      return newCart
    })
  }

  const getCartCount = () => {
    return Object.values(cart || {}).reduce((sum, item) => sum + (item?.quantity || 0), 0)
  }

  const formatPrice = (price) => {
    if (!price) return '€0.00'
    return `€${parseFloat(price).toFixed(2)}`
  }

  const categories = groupDishesByCategory()
  const cartCount = getCartCount()

  return (
    <div className="restaurant-detail-overlay" onClick={onClose}>
      <div className="restaurant-detail" onClick={(e) => e.stopPropagation()}>
        <button className="restaurant-detail-close" onClick={onClose}>
          ×
        </button>

        {/* Cart Button */}
        {cartCount > 0 && (
          <button 
            className="cart-button" 
            onClick={(e) => {
              e.stopPropagation()
              setShowCart(true)
            }}
          >
            <span className="cart-count-badge">{cartCount}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </button>
        )}

        <div className="restaurant-detail-header">
          <h2 className="restaurant-detail-name">{restaurant.name}</h2>
          {restaurant.description && (
            <p className="restaurant-detail-description">{restaurant.description}</p>
          )}
        </div>

        <div className="restaurant-detail-menu">
          {loading && (
            <div className="loading-message">Loading menu...</div>
          )}
          
          {error && (
            <div className="error-message">Error loading menu: {error}</div>
          )}
          
          {!loading && !error && dishes.length === 0 && (
            <div className="empty-message">No menu items available</div>
          )}
          
          {!loading && !error && Object.keys(categories).length > 0 && (
            Object.keys(categories).map(category => (
              <div key={category} className="category-section">
                <h3 className="category-title">{category}</h3>
                <div className="dishes-list">
                  {categories[category].map(dish => {
                    const imageUrl = getImageUrl(dish)
                    const quantity = cart[dish.id]?.quantity || 0
                    return (
                      <div key={dish.id} className="dish-item">
                        <div className="dish-item-content">
                          <div className="dish-item-info">
                            <h4 className="dish-item-name">{dish.name}</h4>
                            {dish.description && (
                              <p className="dish-item-description">{dish.description}</p>
                            )}
                            <div className="dish-item-price">{formatPrice(dish.price)}</div>
                          </div>
                          <div className="dish-item-image-wrapper">
                            <div className="dish-item-image-container">
                              <img 
                                src={imageUrl} 
                                alt={dish.name}
                                className="dish-item-image"
                                onError={(e) => {
                                  e.target.src = getRandomDefaultImage(dish)
                                }}
                              />
                              <button 
                                className="dish-add-button"
                                onClick={() => addToCart(dish)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}

export default RestaurantDetail

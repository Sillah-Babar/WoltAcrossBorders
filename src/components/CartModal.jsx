import React, { useState } from 'react'
import OptimizationPanda from './OptimizationPanda'
import { getMoneySaverRecommendations, getHealthyRecommendations, getRestaurantUpgradeRecommendations } from '../lib/api'
import './RestaurantDetail.css'

function CartModal({ cart, setCart, showCart, setShowCart, onCheckout, onSavingsUpdate }) {
  const [optimizationMode, setOptimizationMode] = useState(null) // 'healthy' or 'money'
  const [recommendations, setRecommendations] = useState({}) // { dishId: [{ product, similarity }] }
  const [recommendationIndices, setRecommendationIndices] = useState({}) // { dishId: currentIndex }
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [showPandas, setShowPandas] = useState(true) // Toggle for pandas visibility
  const [originalPrices, setOriginalPrices] = useState({}) // { dishId: originalPrice } - track original prices before replacements
  const [totalSavings, setTotalSavings] = useState(0) // Total savings from all replacements
  // Get a random default food image
  const getRandomDefaultImage = (dish) => {
    const hash = (dish.id || 0) + (dish.name || '').split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    const randomIndex = (Math.abs(hash) % 4) + 1
    return `/random_food/food${randomIndex}.png`
  }

  const getImageUrl = (dish) => {
    // First priority: use image_url directly if it exists (original image from database for groceries)
    if (dish.image_url && dish.image_url.trim() !== '') {
      return dish.image_url.trim()
    }
    
    // Second priority: check other common image URL field variations
    if (dish.img_url && dish.img_url.trim() !== '') {
      return dish.img_url.trim()
    }
    if (dish.image && dish.image.trim() !== '') {
      return dish.image.trim()
    }
    
    // Then check GCP URLs (for restaurant menu items)
    if (dish.gcp_public_url && dish.gcp_public_url.trim() !== '') {
      return dish.gcp_public_url.trim()
    }
    
    if (dish.gcp_image_url && dish.gcp_image_url.trim() !== '') {
      if (dish.gcp_image_url.startsWith('http://') || dish.gcp_image_url.startsWith('https://')) {
        return dish.gcp_image_url.trim()
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
    
    // Fallback to random food image only if no URL is found
    return getRandomDefaultImage(dish)
  }

  const addToCart = (dish) => {
    setCart(prev => {
      const existingItem = prev[dish.id]
      return {
        ...prev,
        [dish.id]: {
          quantity: (existingItem?.quantity || 0) + 1,
          dish: dish
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

  const getCartSubtotal = () => {
    // Sum of all items currently in cart (after replacements)
    return Object.keys(cart).reduce((total, dishId) => {
      const item = cart[dishId]
      const dish = item?.dish
      const quantity = item?.quantity || 0
      const price = dish?.price || 0
      return total + (price * quantity)
    }, 0)
  }

  const getOriginalTotal = () => {
    // Calculate original total before replacements
    // Sum of all items using their original prices (before any replacements)
    let total = 0
    
    // For each item in current cart, check if it has an original price stored
    Object.keys(cart).forEach(dishId => {
      const item = cart[dishId]
      const dish = item?.dish
      const quantity = item?.quantity || 0
      
      // If this item ID has an original price, use it
      // Otherwise, it means this item was never replaced, so use current price
      if (originalPrices[dishId]) {
        total += originalPrices[dishId] * quantity
      } else {
        // Item was never replaced, so current price is the original
        total += parseFloat(dish?.price || 0) * quantity
      }
    })
    
    return total
  }

  const getCartTotal = () => {
    // If there are savings, show original total minus savings
    // Otherwise, just show subtotal
    if (totalSavings > 0) {
      const originalTotal = getOriginalTotal()
      return originalTotal - totalSavings
    }
    return getCartSubtotal()
  }

  const getCartCount = () => {
    return Object.values(cart || {}).reduce((sum, item) => sum + (item?.quantity || 0), 0)
  }

  const formatPrice = (price) => {
    if (!price) return '€0.00'
    return `€${parseFloat(price).toFixed(2)}`
  }

  // Cart optimization functions
  const optimizeCartForHealthy = async () => {
    setLoadingRecommendations(true)
    try {
      // Fetch healthy recommendations from API
      const recs = await getHealthyRecommendations(cart)
      setRecommendations(recs)
      
      // Initialize recommendation indices
      const indices = {}
      Object.keys(recs).forEach(dishId => {
        indices[dishId] = 0
      })
      setRecommendationIndices(indices)
    } catch (error) {
      console.error('Error fetching healthy recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const optimizeCartForMoney = async () => {
    setLoadingRecommendations(true)
    try {
      // Store original prices before fetching recommendations
      const original = {}
      Object.keys(cart).forEach(dishId => {
        const item = cart[dishId]
        const dish = item?.dish
        if (dish && dish.price) {
          original[dishId] = parseFloat(dish.price)
        }
      })
      setOriginalPrices(original)
      
      // Fetch recommendations from API
      const recs = await getMoneySaverRecommendations(cart)
      setRecommendations(recs)
      
      // Initialize recommendation indices
      const indices = {}
      Object.keys(recs).forEach(dishId => {
        indices[dishId] = 0
      })
      setRecommendationIndices(indices)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }
  
  const navigateRecommendation = (dishId, direction) => {
    const currentIndex = recommendationIndices[dishId] || 0
    const recs = recommendations[dishId] || []
    const maxIndex = recs.length - 1
    
    if (direction === 'prev' && currentIndex > 0) {
      setRecommendationIndices({ ...recommendationIndices, [dishId]: currentIndex - 1 })
    } else if (direction === 'next' && currentIndex < maxIndex) {
      setRecommendationIndices({ ...recommendationIndices, [dishId]: currentIndex + 1 })
    }
  }
  
  const replaceWithRecommendation = (dishId, recommendedProduct) => {
    setCart(prev => {
      const item = prev[dishId]
      if (!item) return prev
      
      const originalPrice = originalPrices[dishId] || parseFloat(item.dish?.price || 0)
      const newPrice = parseFloat(recommendedProduct.price || 0)
      const quantity = item.quantity || 1
      const savings = (originalPrice - newPrice) * quantity
      
      // Update total savings
      setTotalSavings(prevSavings => {
        const newTotalSavings = prevSavings + savings
        // Notify parent component about savings update
        if (onSavingsUpdate) {
          onSavingsUpdate(newTotalSavings)
        }
        return newTotalSavings
      })
      
      // Store original price for the new item ID (in case it gets replaced again)
      setOriginalPrices(prev => {
        const newOriginal = { ...prev }
        // Keep original price for the replaced item
        newOriginal[recommendedProduct.id] = originalPrice
        return newOriginal
      })
      
      const newCart = { ...prev }
      // Remove old item
      delete newCart[dishId]
      // Add recommended product with same quantity
      newCart[recommendedProduct.id] = {
        quantity: item.quantity,
        dish: recommendedProduct
      }
      return newCart
    })
    // Remove recommendations for the replaced item
    const newRecs = { ...recommendations }
    delete newRecs[dishId]
    setRecommendations(newRecs)
    // Also remove from recommendation indices
    const newIndices = { ...recommendationIndices }
    delete newIndices[dishId]
    setRecommendationIndices(newIndices)
  }

  // Check if cart has restaurant items
  const hasRestaurantItems = () => {
    return Object.values(cart).some(item => item.dish && item.dish.restaurant_id)
  }

  // Check if cart has grocery items
  const hasGroceryItems = () => {
    return Object.values(cart).some(item => item.dish && item.dish.category && !item.dish.restaurant_id)
  }

  const handleOptimizationSelect = async (mode) => {
    setOptimizationMode(mode)
    
    if (mode === 'healthy') {
      // Healthy panda only works for grocery items
      if (!hasGroceryItems()) {
        alert('Healthy optimization is only available for grocery items')
        setOptimizationMode(null)
        return
      }
      setShowPandas(false)
      optimizeCartForHealthy()
    } else if (mode === 'money') {
      setShowPandas(false)
      
      // Check if we have restaurant items - use upgrade recommendations
      if (hasRestaurantItems()) {
        await optimizeCartForRestaurantUpgrades()
      }
      
      // Also check for grocery items - use money saver
      if (hasGroceryItems()) {
        await optimizeCartForMoney()
      }
    }
  }

  const optimizeCartForRestaurantUpgrades = async () => {
    setLoadingRecommendations(true)
    try {
      // Fetch restaurant upgrade recommendations from API
      const recs = await getRestaurantUpgradeRecommendations(cart)
      
      // Merge with existing recommendations
      setRecommendations(prev => ({ ...prev, ...recs }))
      
      // Initialize recommendation indices for new recommendations
      const indices = { ...recommendationIndices }
      Object.keys(recs).forEach(dishId => {
        if (!indices[dishId]) {
          indices[dishId] = 0
        }
      })
      setRecommendationIndices(indices)
    } catch (error) {
      console.error('Error fetching restaurant upgrade recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const cartTotal = getCartTotal()
  const cartCount = getCartCount()

  if (!showCart) return null

  return (
    <div className="cart-modal-overlay" onClick={() => setShowCart(false)}>
      <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cart-modal-header">
          <h2 className="cart-modal-title">Your order</h2>
          <button className="cart-modal-close" onClick={() => setShowCart(false)}>×</button>
        </div>
        
        <div className="cart-items">
          {/* Cart Optimization Section - Grocery items first */}
          {Object.keys(cart).length > 0 && hasGroceryItems() && (
            <div className="cart-optimization-section">
              <div className="cart-optimization-header">
                <h3 className="cart-optimization-title">Optimize your order</h3>
                {(optimizationMode === 'money' || optimizationMode === 'healthy') && (
                  <button 
                    className="cart-optimization-toggle"
                    onClick={() => setShowPandas(!showPandas)}
                  >
                    {showPandas ? '▼' : '▲'}
                  </button>
                )}
              </div>
              {showPandas && (
                <div className="cart-optimization-pandas">
                  <OptimizationPanda
                    type="healthy"
                    onSelect={() => handleOptimizationSelect('healthy')}
                    isSelected={optimizationMode === 'healthy'}
                  />
                  <OptimizationPanda
                    type="money"
                    onSelect={() => handleOptimizationSelect('money')}
                    isSelected={optimizationMode === 'money'}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Restaurant Upgrade Section - Shown after grocery section */}
          {Object.keys(cart).length > 0 && hasRestaurantItems() && (
            <div className="cart-optimization-section">
              <div className="cart-optimization-header">
                <h3 className="cart-optimization-title">Upgrade your order</h3>
                {optimizationMode === 'money' && (
                  <button 
                    className="cart-optimization-toggle"
                    onClick={() => setShowPandas(!showPandas)}
                  >
                    {showPandas ? '▼' : '▲'}
                  </button>
                )}
              </div>
              {showPandas && (
                <div className="cart-optimization-pandas">
                  <OptimizationPanda
                    type="money"
                    onSelect={() => handleOptimizationSelect('money')}
                    isSelected={optimizationMode === 'money'}
                  />
                </div>
              )}
            </div>
          )}

          {Object.keys(cart).length === 0 ? (
            <div className="cart-empty">Your cart is empty</div>
          ) : (
            // Sort cart items: grocery items first, then restaurant items
            Object.keys(cart)
              .sort((dishIdA, dishIdB) => {
                const dishA = cart[dishIdA]?.dish
                const dishB = cart[dishIdB]?.dish
                
                // Check if items are grocery (have category but no restaurant_id) or restaurant (have restaurant_id)
                const isGroceryA = dishA && dishA.category && !dishA.restaurant_id
                const isGroceryB = dishB && dishB.category && !dishB.restaurant_id
                
                // Grocery items come first (return -1), restaurant items come second (return 1)
                if (isGroceryA && !isGroceryB) return -1
                if (!isGroceryA && isGroceryB) return 1
                return 0 // Same type, maintain original order
              })
              .map(dishId => {
              const item = cart[dishId]
              const dish = item?.dish
              const quantity = item?.quantity || 0
              if (!dish) return null
              
              const itemRecs = recommendations[dishId] || []
              const currentRecIndex = recommendationIndices[dishId] || 0
              const currentRec = itemRecs[currentRecIndex]
              const hasMultipleRecs = itemRecs.length > 1
              
              return (
                <div key={dishId}>
                  <div className="cart-item">
                    <img 
                      src={getImageUrl(dish)} 
                      alt={dish.name || dish.product_name || 'Product image'}
                      className="cart-item-image"
                      onError={(e) => {
                        e.target.src = getRandomDefaultImage(dish)
                      }}
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{dish.name || dish.product_name || 'Unnamed Item'}</div>
                      {dish.description && (
                        <div className="cart-item-description">{dish.description}</div>
                      )}
                      <div className="cart-item-price">{formatPrice(dish.price)}</div>
                    </div>
                    <div className="cart-item-controls">
                      <button 
                        className="cart-item-button"
                        onClick={() => removeFromCart(parseInt(dishId))}
                      >
                        −
                      </button>
                      <span className="cart-item-quantity">{quantity}</span>
                      <button 
                        className="cart-item-button"
                        onClick={() => addToCart(dish)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* Recommendations */}
                  {(optimizationMode === 'money' || optimizationMode === 'healthy') && currentRec && (
                    <div className="cart-recommendation">
                      <div className="cart-recommendation-header">
                        <span className="cart-recommendation-label">
                          {optimizationMode === 'money' 
                            ? (dish.restaurant_id ? 'Upgrade option:' : 'Cheaper alternative:')
                            : 'Healthier alternative:'}
                        </span>
                        {hasMultipleRecs && (
                          <div className="cart-recommendation-nav">
                            <button
                              className="cart-recommendation-arrow"
                              onClick={() => navigateRecommendation(dishId, 'prev')}
                              disabled={currentRecIndex === 0}
                            >
                              ←
                            </button>
                            <span className="cart-recommendation-counter">
                              {currentRecIndex + 1} / {itemRecs.length}
                            </span>
                            <button
                              className="cart-recommendation-arrow"
                              onClick={() => navigateRecommendation(dishId, 'next')}
                              disabled={currentRecIndex === itemRecs.length - 1}
                            >
                              →
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="cart-recommendation-item">
                        <div className="cart-recommendation-item-content">
                          <img 
                            src={getImageUrl(currentRec)} 
                            alt={currentRec.name}
                            className="cart-recommendation-image"
                            onError={(e) => {
                              e.target.src = getRandomDefaultImage(currentRec)
                            }}
                          />
                          <div className="cart-recommendation-info">
                            <div className="cart-recommendation-name">{currentRec.name}</div>
                            {currentRec.description && (
                              <div className="cart-recommendation-description">{currentRec.description}</div>
                            )}
                            {optimizationMode === 'money' ? (
                              <div className="cart-recommendation-price">
                                {formatPrice(currentRec.price)}
                                {dish.restaurant_id ? (
                                  <span className="cart-recommendation-upgrade">
                                    +{formatPrice(currentRec.upgrade_amount || (currentRec.price - dish.price))}
                                  </span>
                                ) : (
                                  <span className="cart-recommendation-savings">
                                    Save {formatPrice(dish.price - currentRec.price)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="cart-recommendation-price">
                                {formatPrice(currentRec.price)}
                                {currentRec.nutrition_reason && (
                                  <span className="cart-recommendation-nutrition-reason">
                                    {currentRec.nutrition_reason}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          className="cart-recommendation-replace"
                          onClick={() => replaceWithRecommendation(dishId, currentRec)}
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {Object.keys(cart).length > 0 && (
          <div className="cart-footer">
            {totalSavings > 0 ? (
              <>
                <div className="cart-subtotal">
                  <span className="cart-subtotal-label">Subtotal:</span>
                  <span className="cart-subtotal-price">{formatPrice(getOriginalTotal())}</span>
                </div>
                <div className="cart-savings">
                  <span className="cart-savings-label">Money Saver savings</span>
                  <span className="cart-savings-amount">-{formatPrice(totalSavings)}</span>
                </div>
              </>
            ) : (
              <div className="cart-subtotal">
                <span className="cart-subtotal-label">Subtotal:</span>
                <span className="cart-subtotal-price">{formatPrice(getCartSubtotal())}</span>
              </div>
            )}
            <div className="cart-total">
              <span className="cart-total-label">Total:</span>
              <span className="cart-total-price">{formatPrice(cartTotal)}</span>
            </div>
                <button 
                  className="cart-checkout-button" 
                  data-count={cartCount}
                  onClick={() => {
                    setShowCart(false)
                    if (onCheckout) {
                      onCheckout()
                    }
                  }}
                >
                  <span className="cart-checkout-text">Go to checkout</span>
                  <span className="cart-checkout-total">{formatPrice(cartTotal)}</span>
                </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartModal


import React, { useState } from 'react'
import DeliveryConfirmation from './DeliveryConfirmation'
import './Checkout.css'

function Checkout({ cart, setCart, onClose, user, onAddMore, onOrderComplete, totalSavings = 0 }) {
  const [deliveryOption, setDeliveryOption] = useState('standard') // 'priority' or 'standard'
  const [courierTip, setCourierTip] = useState(0)
  const [courierNote, setCourierNote] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [useWoltPoints, setUseWoltPoints] = useState(false)
  const [showDeliveryConfirmation, setShowDeliveryConfirmation] = useState(false)

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

  const formatPrice = (price) => {
    if (!price) return '€0.00'
    return `€${parseFloat(price).toFixed(2)}`
  }

  // Calculate totals
  const getItemSubtotal = () => {
    return Object.keys(cart).reduce((total, dishId) => {
      const item = cart[dishId]
      const dish = item?.dish
      const quantity = item?.quantity || 0
      const price = dish?.price || 0
      return total + (price * quantity)
    }, 0)
  }

  const getServiceFee = () => {
    const subtotal = getItemSubtotal()
    return subtotal * 0.08 // 8% service fee
  }

  const getDeliveryFee = () => {
    if (deliveryOption === 'priority') {
      return 1.99
    }
    return 0 // Free delivery for standard (new user offer)
  }

  const getTotal = () => {
    const subtotal = getItemSubtotal()
    const serviceFee = getServiceFee()
    const delivery = getDeliveryFee()
    const tip = courierTip
    // Subtract savings from total
    return subtotal + serviceFee + delivery + tip - totalSavings
  }

  const getWoltPlusTotal = () => {
    const total = getTotal()
    return total - 0.31 // Wolt+ discount
  }

  const itemSubtotal = getItemSubtotal()
  const serviceFee = getServiceFee()
  const deliveryFee = getDeliveryFee()
  const total = getTotal()
  const woltPlusTotal = getWoltPlusTotal()

  // If cart is empty, close checkout
  if (Object.keys(cart).length === 0) {
    return null
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

  const tipOptions = [0, 1, 2, 5]

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-container" onClick={(e) => e.stopPropagation()}>
        <button className="checkout-close" onClick={onClose}>×</button>

        <div className="checkout-content">
          {/* Left Panel */}
          <div className="checkout-left">
            {/* Courier Note */}
            <div className="checkout-section">
              <label className="checkout-label">Add note for the courier</label>
              <textarea
                className="checkout-textarea"
                placeholder="Add note for the courier"
                value={courierNote}
                onChange={(e) => setCourierNote(e.target.value)}
              />
            </div>

            {/* Delivery Options */}
            <div className="checkout-section">
              <h3 className="checkout-section-title">When?</h3>
              <div className="delivery-options">
                <label className={`delivery-option ${deliveryOption === 'priority' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="priority"
                    checked={deliveryOption === 'priority'}
                    onChange={(e) => setDeliveryOption(e.target.value)}
                  />
                  <div className="delivery-option-content">
                    <div className="delivery-option-header">
                      <span className="delivery-option-name">Priority</span>
                      <span className="delivery-option-badge">New</span>
                      <span className="delivery-option-price">+€1.99</span>
                    </div>
                    <div className="delivery-option-time">10-20 min • Direct to you</div>
                  </div>
                </label>
                <label className={`delivery-option ${deliveryOption === 'standard' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="standard"
                    checked={deliveryOption === 'standard'}
                    onChange={(e) => setDeliveryOption(e.target.value)}
                  />
                  <div className="delivery-option-content">
                    <div className="delivery-option-header">
                      <span className="delivery-option-name">Standard</span>
                    </div>
                    <div className="delivery-option-time">15-25 min</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Order Items */}
            <div className="checkout-section">
              <div className="checkout-section-header">
                <h3 className="checkout-section-title">Order items</h3>
                <button className="checkout-link-button" onClick={() => { onClose(); if (onAddMore) onAddMore(); }}>+ Add more</button>
              </div>
              <div className="checkout-items">
                {Object.keys(cart).map(dishId => {
                  const item = cart[dishId]
                  const dish = item?.dish
                  const quantity = item?.quantity || 0
                  if (!dish) return null
                  
                  return (
                    <div key={dishId} className="checkout-item">
                      <img 
                        src={getImageUrl(dish)} 
                        alt={dish.name}
                        className="checkout-item-image"
                        onError={(e) => {
                          e.target.src = getRandomDefaultImage(dish)
                        }}
                      />
                      <div className="checkout-item-info">
                        <div className="checkout-item-name">{dish.name}</div>
                        {dish.description && (
                          <div className="checkout-item-description">{dish.description}</div>
                        )}
                        <div className="checkout-item-price">{formatPrice(dish.price)}</div>
                      </div>
                      <div className="checkout-item-controls">
                        <button 
                          className="checkout-item-button"
                          onClick={() => removeFromCart(parseInt(dishId))}
                        >
                          −
                        </button>
                        <span className="checkout-item-quantity">{quantity}</span>
                        <button 
                          className="checkout-item-button"
                          onClick={() => addToCart(dish)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payment */}
            <div className="checkout-section">
              <h3 className="checkout-section-title">Payment</h3>
              <button className="payment-method-button" onClick={() => setShowPaymentModal(true)}>
                <div className="payment-method-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <span>{selectedPaymentMethod || 'Choose a payment method'}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              {!selectedPaymentMethod && (
                <p className="payment-method-hint">Please add a payment method to continue with your order</p>
              )}
            </div>

            {/* Use Wolt Points */}
            <div className="checkout-section">
              <div className="wolt-points-section">
                <div className="wolt-points-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  <div>
                    <div className="wolt-points-title">Use Wolt Points</div>
                    <div className="wolt-points-subtitle">0 points available</div>
                  </div>
                </div>
                <div className="wolt-points-control">
                  <span>0 points</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={useWoltPoints}
                      onChange={(e) => setUseWoltPoints(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Offers and Savings */}
            <div className="checkout-section">
              <div className="offers-section">
                <div className="offers-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  <div>
                    <div className="offers-title">Offers and savings</div>
                    <div className="offers-subtitle">1 offer applied</div>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>

            {/* Courier Tip */}
            <div className="checkout-section">
              <h3 className="checkout-section-title">Add courier tip</h3>
              <p className="checkout-section-subtitle">They'll get 100% of your tip after the delivery. <span className="tip-amount">{formatPrice(courierTip)}</span></p>
              <div className="tip-options">
                {tipOptions.map(tip => (
                  <button
                    key={tip}
                    className={`tip-button ${courierTip === tip ? 'selected' : ''}`}
                    onClick={() => setCourierTip(tip)}
                  >
                    €{tip}
                  </button>
                ))}
                <button
                  className={`tip-button ${courierTip !== 0 && !tipOptions.includes(courierTip) ? 'selected' : ''}`}
                  onClick={() => {
                    const customTip = prompt('Enter custom tip amount (€):')
                    if (customTip) {
                      setCourierTip(parseFloat(customTip) || 0)
                    }
                  }}
                >
                  Other
                </button>
              </div>
            </div>

            {/* Redeem Code */}
            <div className="checkout-section">
              <h3 className="checkout-section-title">Redeem code</h3>
              <p className="checkout-section-subtitle">If you have a Wolt gift card or promo code, enter it below to claim your benefits.</p>
              <div className="redeem-code-section">
                <input
                  type="text"
                  className="redeem-code-input"
                  placeholder="Enter code..."
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <button className="redeem-code-button">Submit</button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="checkout-right">
            {/* Summary */}
            <div className="checkout-summary">
              <h2 className="checkout-summary-title">Summary</h2>
              <p className="checkout-summary-subtitle">incl. taxes (if applicable)</p>
              <a href="#" className="checkout-summary-link">How fees work</a>
              
              <div className="checkout-summary-breakdown">
                <div className="summary-row">
                  <span>Item subtotal</span>
                  <span>{formatPrice(itemSubtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Service fee</span>
                  <span>{formatPrice(serviceFee)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery (1 km)</span>
                  <span className="discounted-price">
                    <span className="strikethrough">{formatPrice(3.99)}</span>
                    <span className="green-price">{formatPrice(deliveryFee)}</span>
                  </span>
                </div>
                {courierTip > 0 && (
                  <div className="summary-row">
                    <span>Courier tip</span>
                    <span>{formatPrice(courierTip)}</span>
                  </div>
                )}
                {totalSavings > 0 && (
                  <div className="summary-row savings-row">
                    <span>Money Saver savings</span>
                    <span className="savings-amount">-{formatPrice(totalSavings)}</span>
                  </div>
                )}
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Applied Offers */}
            {deliveryFee === 0 && (
              <div className="checkout-offers">
                <h3 className="checkout-offers-title">Applied offers</h3>
                <div className="checkout-offer-item">
                  <span className="checkout-offer-discount">-€3.99</span>
                  <p className="checkout-offer-text">New users enjoy €0 delivery fees for 14 days</p>
                </div>
              </div>
            )}

            {/* Wolt+ Promotion */}
            <div className="wolt-plus-card">
              <div className="wolt-plus-badge">Wolt+</div>
              <div className="wolt-plus-content">
                <p className="wolt-plus-label">Only with Wolt+</p>
                <div className="wolt-plus-pricing">
                  <span className="wolt-plus-old-price">{formatPrice(total)}</span>
                  <span className="wolt-plus-new-price">{formatPrice(woltPlusTotal)}</span>
                </div>
                <p className="wolt-plus-description">Get €0 delivery fee and more with Wolt+.</p>
                <a href="#" className="wolt-plus-link">Learn more</a>
                <button className="wolt-plus-button">Try free for 30 days</button>
              </div>
            </div>

            {/* Phone Verification / Checkout */}
            <button 
              className="phone-verification-button"
              onClick={() => {
                if (selectedPaymentMethod) {
                  setShowDeliveryConfirmation(true)
                } else {
                  alert('Please select a payment method first')
                }
              }}
            >
              <div className="phone-verification-content">
                <span className="phone-verification-title">
                  {selectedPaymentMethod ? 'Place Order' : 'Please verify your phone number'}
                </span>
                <span className="phone-verification-subtitle">
                  {selectedPaymentMethod ? 'Click to checkout' : 'Click to verify'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <h2 className="payment-modal-title">Payment methods</h2>
              <button className="payment-modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            
            <div className="payment-modal-content">
              <h3 className="payment-modal-section-title">Credit and debit cards</h3>
              <button className="payment-method-add">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Add new card</span>
              </button>

              <h3 className="payment-modal-section-title">Other methods</h3>
              <div className="payment-methods-list">
                <button className="payment-method-item" onClick={() => { setSelectedPaymentMethod('Apple Pay'); setShowPaymentModal(false); }}>
                  <div className="payment-method-info">
                    <span className="payment-method-name">Apple Pay</span>
                  </div>
                  <button className="payment-method-action">Choose</button>
                </button>
                <button className="payment-method-item" onClick={() => { setSelectedPaymentMethod('Google Pay'); setShowPaymentModal(false); }}>
                  <div className="payment-method-info">
                    <span className="payment-method-name">Google Pay</span>
                  </div>
                  <button className="payment-method-action">Choose</button>
                </button>
                <button className="payment-method-item" onClick={() => { setSelectedPaymentMethod('PayPal'); setShowPaymentModal(false); }}>
                  <div className="payment-method-info">
                    <span className="payment-method-name">PayPal</span>
                  </div>
                  <button className="payment-method-action">Activate</button>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Confirmation */}
      {showDeliveryConfirmation && (
        <DeliveryConfirmation
          onComplete={() => {
            setShowDeliveryConfirmation(false)
            setCart({}) // Clear cart
            onClose() // Close checkout
            if (onOrderComplete) {
              onOrderComplete() // Navigate back to main page
            }
          }}
        />
      )}
    </div>
  )
}

export default Checkout


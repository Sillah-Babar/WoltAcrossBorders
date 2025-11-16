import React from 'react'
import './GroceryProductCard.css'

function GroceryProductCard({ product, cart, setCart, showCart, setShowCart }) {
  const formatPrice = (price) => {
    if (!price) return '€0.00'
    return `€${parseFloat(price).toFixed(2)}`
  }

  // Get image URL from grocery product - prioritize image_url field from database
  const getImageUrl = (product) => {
    // First priority: use image_url directly if it exists (original image from database)
    if (product.image_url && product.image_url.trim() !== '') {
      return product.image_url.trim()
    }
    
    // Second priority: check other common image URL field variations
    if (product.img_url && product.img_url.trim() !== '') {
      return product.img_url.trim()
    }
    if (product.image && product.image.trim() !== '') {
      return product.image.trim()
    }
    
    // Then check GCP URLs
    if (product.gcp_public_url && product.gcp_public_url.trim() !== '') {
      return product.gcp_public_url.trim()
    }
    
    if (product.gcp_image_url && product.gcp_image_url.trim() !== '') {
      if (product.gcp_image_url.startsWith('http://') || product.gcp_image_url.startsWith('https://')) {
        return product.gcp_image_url.trim()
      }
      if (product.gcp_bucket && product.gcp_path) {
        return `https://storage.googleapis.com/${product.gcp_bucket}/${product.gcp_path}`
      }
      if (product.gcp_bucket && product.gcp_image_url) {
        return `https://storage.googleapis.com/${product.gcp_bucket}/${product.gcp_image_url}`
      }
    }
    
    if (product.gcp_bucket && product.gcp_path) {
      return `https://storage.googleapis.com/${product.gcp_bucket}/${product.gcp_path}`
    }
    
    // Fallback to random food image only if no URL is found
    return getRandomDefaultImage(product)
  }

  // Get a random default food image
  const getRandomDefaultImage = (product) => {
    const hash = (product.id || 0) + (product.name || '').split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    const randomIndex = (Math.abs(hash) % 4) + 1
    return `/random_food/food${randomIndex}.png`
  }

  const addToCart = (product) => {
    setCart(prev => {
      const existingItem = prev[product.id]
      return {
        ...prev,
        [product.id]: {
          quantity: (existingItem?.quantity || 0) + 1,
          dish: product // Store as dish for compatibility with cart modal
        }
      }
    })
  }

  const quantity = cart[product.id]?.quantity || 0

  return (
    <div className="grocery-product-card">
      <div className="grocery-product-image-container">
        <img 
          src={getImageUrl(product)} 
          alt={product.name}
          className="grocery-product-image"
          onError={(e) => {
            e.target.src = getRandomDefaultImage(product)
          }}
        />
        <button 
          className="grocery-product-add-button"
          onClick={() => addToCart(product)}
        >
          +
        </button>
        {quantity > 0 && (
          <div className="grocery-product-quantity-badge">{quantity}</div>
        )}
      </div>
      <div className="grocery-product-info">
        <h3 className="grocery-product-name">{product.name}</h3>
        {product.description && (
          <p className="grocery-product-description">{product.description}</p>
        )}
        <div className="grocery-product-price">{formatPrice(product.price)}</div>
      </div>
    </div>
  )
}

export default GroceryProductCard


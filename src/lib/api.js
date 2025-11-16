// API service for money saver and healthy recommendations
// Backend server should be running on the configured API_BASE_URL

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function getMoneySaverRecommendations(cartItems) {
  try {
    // Filter only grocery items from cart
    const groceryItems = Object.values(cartItems)
      .filter(item => item.dish && (item.dish.category || item.dish.name))
      .map(item => ({
        id: item.dish.id,
        name: item.dish.name,
        category: item.dish.category || '',
        price: parseFloat(item.dish.price) || 0,
        description: item.dish.description || ''
      }))

    if (groceryItems.length === 0) {
      return {}
    }

    const response = await fetch(`${API_BASE_URL}/api/money-saver/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: groceryItems })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations')
    }

    const data = await response.json()
    return data.recommendations || {}
  } catch (error) {
    console.error('Error fetching money saver recommendations:', error)
    return {}
  }
}

export async function getHealthyRecommendations(cartItems) {
  try {
    // Filter only grocery items from cart
    const groceryItems = Object.values(cartItems)
      .filter(item => item.dish && (item.dish.category || item.dish.name))
      .map(item => ({
        id: item.dish.id,
        name: item.dish.name,
        category: item.dish.category || '',
        price: parseFloat(item.dish.price) || 0,
        description: item.dish.description || ''
      }))

    if (groceryItems.length === 0) {
      return {}
    }

    const response = await fetch(`${API_BASE_URL}/api/healthy/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: groceryItems })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch healthy recommendations')
    }

    const data = await response.json()
    return data.recommendations || {}
  } catch (error) {
    console.error('Error fetching healthy recommendations:', error)
    return {}
  }
}

export async function getRestaurantUpgradeRecommendations(cartItems) {
  try {
    // Filter only restaurant items from cart (items with restaurant_id)
    const restaurantItems = Object.values(cartItems)
      .filter(item => item.dish && item.dish.restaurant_id)
      .map(item => ({
        id: item.dish.id,
        name: item.dish.name,
        price: parseFloat(item.dish.price) || 0,
        restaurant_id: item.dish.restaurant_id
      }))

    if (restaurantItems.length === 0) {
      return {}
    }

    const response = await fetch(`${API_BASE_URL}/api/restaurant/upgrade-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: restaurantItems })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch restaurant upgrade recommendations')
    }

    const data = await response.json()
    return data.recommendations || {}
  } catch (error) {
    console.error('Error fetching restaurant upgrade recommendations:', error)
    return {}
  }
}

export async function detectParcelDamage(imageBase64, comment) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/complaint/damage-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        comment: comment
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to analyze damage')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error detecting parcel damage:', error)
    throw error
  }
}


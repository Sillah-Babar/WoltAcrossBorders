import React, { useState, useEffect } from 'react'
import GroceryProductCard from './GroceryProductCard'
import { supabase } from '../lib/supabase'
import './AllGroceryProducts.css'

function AllGroceryProducts({ cart, setCart, showCart, setShowCart }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGroceryProducts()
  }, [])

  const fetchGroceryProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('grocery_products')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching grocery products:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="all-grocery-products">
        <h2 className="section-title">All grocery products</h2>
        <div className="loading-message">Loading products...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="all-grocery-products">
        <h2 className="section-title">All grocery products</h2>
        <div className="error-message">Error loading products: {error}</div>
      </div>
    )
  }

  return (
    <div className="all-grocery-products">
      <h2 className="section-title">All grocery products</h2>
      <div className="grocery-products-grid">
        {products.map(product => (
          <GroceryProductCard 
            key={product.id} 
            product={product}
            cart={cart}
            setCart={setCart}
            showCart={showCart}
            setShowCart={setShowCart}
          />
        ))}
      </div>
    </div>
  )
}

export default AllGroceryProducts


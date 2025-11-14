import React from 'react'
import './CategoriesSection.css'

function CategoriesSection() {
  const categories = [
    { name: 'Hamburger', seats: 32, image: '🍔' },
    { name: 'Food', seats: 12, image: '🌮' },
    { name: 'Pizza', seats: 27, image: '🍕' },
    { name: 'Bread', seats: 9, image: '🥖' },
    { name: 'Kebab', seats: 25, image: '🥙' },
    { name: 'Dessert', seats: 20, image: '🍩' }
  ]

  return (
    <div className="categories-section">
      <div className="categories-header">
        <div className="categories-title-wrapper">
          <h2 className="categories-title">Browse categories</h2>
          <svg className="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div className="categories-controls">
          <div className="sorting-info">
            <span>Sorting method </span>
            <span className="sorting-value">Recommended</span>
          </div>
          <button className="filter-button-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
          </button>
          <div className="scroll-arrows">
            <button className="scroll-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button className="scroll-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="categories-scroll">
        <div className="categories-list">
          {categories.map((category, index) => (
            <div key={index} className="category-card">
              <div className="category-image">
                <div className="category-emoji">{category.image}</div>
              </div>
              <div className="category-info">
                <h3 className="category-name">{category.name}</h3>
                <p className="category-seats">{category.seats} seats</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CategoriesSection


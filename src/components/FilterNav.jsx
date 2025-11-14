import React, { useState } from 'react'
import './FilterNav.css'

function FilterNav() {
  const [activeFilter, setActiveFilter] = useState('restaurants')

  const filters = [
    { id: 'introducing', label: 'Introducing', icon: 'compass' },
    { id: 'restaurants', label: 'Restaurants', icon: 'fork-knife' },
    { id: 'bargain', label: 'Bargain', icon: 'bag' }
  ]

  return (
    <nav className="filter-nav">
      <div className="filter-nav-content">
        {filters.map(filter => (
          <button
            key={filter.id}
            className={`filter-button ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.icon === 'compass' && (
              <svg className="filter-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
              </svg>
            )}
            {filter.icon === 'fork-knife' && (
              <svg className="filter-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 2v20M5 2h4M5 6h4M5 10h4"></path>
                <path d="M19 2v20M19 2h-4M19 6h-4M19 10h-4"></path>
                <path d="M12 2v20"></path>
              </svg>
            )}
            {filter.icon === 'bag' && (
              <svg className="filter-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            )}
            <span>{filter.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default FilterNav


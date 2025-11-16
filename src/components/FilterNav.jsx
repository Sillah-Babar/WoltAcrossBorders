import React, { useState } from 'react'
import './FilterNav.css'

function FilterNav({ activeFilter, onFilterChange }) {
  const [localFilter, setLocalFilter] = useState(activeFilter || 'restaurants')

  const filters = [
    { id: 'restaurants', label: 'Restaurants', icon: 'fork-knife' },
    { id: 'grocery', label: 'Grocery', icon: 'grocery' }
  ]

  const handleFilterClick = (filterId) => {
    setLocalFilter(filterId)
    if (onFilterChange) {
      onFilterChange(filterId)
    }
  }

  const currentFilter = activeFilter || localFilter

  return (
    <nav className="filter-nav">
      <div className="filter-nav-content">
        {filters.map(filter => (
          <button
            key={filter.id}
            className={`filter-button ${currentFilter === filter.id ? 'active' : ''}`}
            onClick={() => handleFilterClick(filter.id)}
          >
            {filter.icon === 'fork-knife' && (
              <svg className="filter-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 2v20M5 2h4M5 6h4M5 10h4"></path>
                <path d="M19 2v20M19 2h-4M19 6h-4M19 10h-4"></path>
                <path d="M12 2v20"></path>
              </svg>
            )}
            {filter.icon === 'grocery' && (
              <svg className="filter-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
                <circle cx="9" cy="14" r="1"></circle>
                <circle cx="15" cy="14" r="1"></circle>
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


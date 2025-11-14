import React from 'react'
import Header from './components/Header'
import FilterNav from './components/FilterNav'
import CategoriesSection from './components/CategoriesSection'
import AllRestaurants from './components/AllRestaurants'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <FilterNav />
      <div className="main-content">
        <h1 className="main-title">Restaurants near me</h1>
        <CategoriesSection />
        <AllRestaurants />
      </div>
    </div>
  )
}

export default App


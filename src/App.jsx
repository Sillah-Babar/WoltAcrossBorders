import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import FilterNav from './components/FilterNav'
import AllRestaurants from './components/AllRestaurants'
import AllGroceryProducts from './components/AllGroceryProducts'
import RestaurantDetail from './components/RestaurantDetail'
import LandingPage from './components/LandingPage'
import CartModal from './components/CartModal'
import Checkout from './components/Checkout'
import ComplaintModal from './components/ComplaintModal'
import NotificationCenter from './components/NotificationCenter'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [user, setUser] = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [activeFilter, setActiveFilter] = useState('restaurants')
  const [cart, setCart] = useState({}) // { dishId: quantity }
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [totalSavings, setTotalSavings] = useState(0) // Track total savings from money saver
  const [showComplaint, setShowComplaint] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      // If user is signed in, skip landing page
      if (currentUser) {
        setShowLanding(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      // If user signs in, automatically go to restaurants
      if (currentUser) {
        setShowLanding(false)
      } else {
        // If user signs out, go back to landing page
        setShowLanding(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load notifications from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications')
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications))
      } catch (e) {
        console.error('Error loading notifications:', e)
      }
    }
  }, [])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications))
    }
  }, [notifications])

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev])
  }

  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
  }

  const handleClearAllNotifications = () => {
    setNotifications([])
    localStorage.removeItem('notifications')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setShowLanding(true)
  }

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} user={user} onSignOut={handleSignOut} />
  }

  return (
    <div className="app">
      <Header 
        user={user} 
        onSignOut={handleSignOut} 
        cart={cart}
        showCart={showCart}
        setShowCart={setShowCart}
        onComplaintClick={() => setShowComplaint(true)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onClearAllNotifications={handleClearAllNotifications}
      />
      <FilterNav 
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <div className="main-content">
        {activeFilter === 'restaurants' ? (
          <>
        <h1 className="main-title">Restaurants near me</h1>
            <AllRestaurants onRestaurantClick={setSelectedRestaurant} />
          </>
        ) : (
          <>
            <h1 className="main-title">Grocery products</h1>
            <AllGroceryProducts 
              cart={cart}
              setCart={setCart}
              showCart={showCart}
              setShowCart={setShowCart}
            />
          </>
        )}
      </div>
      
      {selectedRestaurant && (
        <RestaurantDetail
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          cart={cart}
          setCart={setCart}
          showCart={showCart}
          setShowCart={setShowCart}
        />
      )}

      <CartModal
        cart={cart}
        setCart={setCart}
        showCart={showCart}
        setShowCart={setShowCart}
        onCheckout={() => setShowCheckout(true)}
        onSavingsUpdate={setTotalSavings}
      />

      {showCheckout && (
        <Checkout
          cart={cart}
          setCart={setCart}
          onClose={() => setShowCheckout(false)}
          user={user}
          onAddMore={() => {
            setShowCheckout(false)
            setShowCart(true)
          }}
          onOrderComplete={() => {
            setShowCheckout(false)
            setSelectedRestaurant(null)
            setTotalSavings(0) // Reset savings after order
            // Already navigated back to main page
          }}
          totalSavings={totalSavings}
        />
      )}

      <ComplaintModal
        show={showComplaint}
        onClose={() => setShowComplaint(false)}
        onNotification={handleNewNotification}
      />
    </div>
  )
}

export default App


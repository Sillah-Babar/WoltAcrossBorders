import React, { useState } from 'react'
import './Header.css'
import AuthModal from './AuthModal'
import SettingsModal from './SettingsModal'
import NotificationCenter from './NotificationCenter'

function Header({ user, onSignOut, hideSignIn = false, cart, showCart, setShowCart, onComplaintClick, notifications = [], onMarkAsRead, onClearAllNotifications }) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' or 'signup'

  const getCartCount = () => {
    return Object.values(cart || {}).reduce((sum, item) => sum + (item?.quantity || 0), 0)
  }

  const cartCount = getCartCount()

  const handleSignInClick = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  const handleSignUpClick = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
  }

  return (
    <>
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">Wolt</div>
        </div>
        
        <div className="header-right">
            <div className="nav-link">
              <span>Partners</span>
            <svg className="chevron-down" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
            <div className="nav-link">
              <span>Jobs</span>
            </div>
            {user ? (
              <>
                <button className="header-complaint-button" onClick={onComplaintClick} title="Complain">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
                <NotificationCenter
                  notifications={notifications}
                  onMarkAsRead={onMarkAsRead}
                  onClearAll={onClearAllNotifications}
                />
                <button className="header-cart-button" onClick={() => setShowCart && setShowCart(true)}>
                  {cartCount > 0 && (
                    <span className="header-cart-count-badge">{cartCount}</span>
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
                </button>
                <div className="profile-section" onClick={() => setShowSettings(true)}>
                  <div className="profile-icon">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="sign-out-text">Settings</span>
                </div>
                <div className="profile-section" onClick={onSignOut}>
                  <span className="sign-out-text">Sign Out</span>
                </div>
              </>
            ) : (
              !hideSignIn && (
                <button className="sign-in-button" onClick={handleSignInClick}>
                  Sign In
                </button>
              )
            )}
        </div>
      </div>
    </header>
      
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
        />
      )}
      
      {showSettings && user && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}

export default Header


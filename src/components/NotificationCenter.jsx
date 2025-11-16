import React, { useState, useEffect } from 'react'
import './NotificationCenter.css'

function NotificationCenter({ notifications, onMarkAsRead, onClearAll }) {
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    // Auto-show notifications if there are unread ones
    if (unreadCount > 0 && !showNotifications) {
      setShowNotifications(true)
    }
  }, [unreadCount])

  return (
    <div className="notification-center">
      <button
        className="notification-button"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button className="clear-all-button" onClick={onClearAll}>
                Clear All
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => !notification.read && onMarkAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    {notification.assessment && (
                      <div className="notification-assessment">
                        <div className={`assessment-badge ${notification.assessment.is_damaged ? 'damaged' : 'not-damaged'}`}>
                          {notification.assessment.is_damaged ? 'Damage Found' : 'No Damage'}
                        </div>
                        <div className="assessment-recommendation">
                          {notification.assessment.recommendation === 'approve_return' && '✓ Return Approved'}
                          {notification.assessment.recommendation === 'reject_return' && '✗ Return Rejected'}
                          {notification.assessment.recommendation === 'needs_review' && '⚠ Needs Review'}
                        </div>
                      </div>
                    )}
                    <div className="notification-time">
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {!notification.read && <div className="notification-unread-indicator" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter


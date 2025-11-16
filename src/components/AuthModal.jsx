import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import './AuthModal.css'

function AuthModal({ mode, onClose, onSwitchMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        // Sign up with custom email options
        // Note: To customize email templates with Wolt branding, go to Supabase Dashboard > 
        // Authentication > Email Templates and customize the confirmation email template
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            // You can customize email templates in Supabase Dashboard:
            // Authentication > Email Templates > Confirmation
            // Change the sender name, subject, and HTML content to match Wolt branding
          },
        })

        if (authError) throw authError

        // Insert user data into users table
        if (authData.user) {
          const { error: dbError } = await supabase
            .from('users')
            .insert([
              {
                email: email,
                password: password, // Stored as requested, but Supabase Auth handles the secure password
                // id will be auto-generated (BIGSERIAL)
                // created_at and updated_at will use defaults
              },
            ])

          if (dbError) {
            // If user already exists, that's okay - they might have signed up before
            if (dbError.code === '23505') {
              // Unique constraint violation - email already exists
              console.log('User already exists in database')
            } else {
              console.error('Database error:', dbError)
              // Don't throw - auth user was created successfully
            }
          }
        }

        setSuccess('Account created successfully! Please check your email to verify your account.')
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        setSuccess('Signed in successfully!')
        setTimeout(() => {
          onClose()
          // User state will update automatically via onAuthStateChange in App.jsx
        }, 1000)
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="auth-modal-content">
          <h2 className="auth-modal-title">
            {mode === 'signup' ? 'Sign Up' : 'Sign In'}
          </h2>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
            
            <div className="auth-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            
            <button 
              type="submit" 
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
          
          <div className="auth-switch">
            {mode === 'signin' ? (
              <>
                <span>Don't have an account? </span>
                <button onClick={onSwitchMode} className="auth-switch-link">
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <span>Already have an account? </span>
                <button onClick={onSwitchMode} className="auth-switch-link">
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal


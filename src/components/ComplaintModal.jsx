import React, { useState, useRef, useEffect } from 'react'
import { detectParcelDamage } from '../lib/api'
import './ComplaintModal.css'

function ComplaintModal({ show, onClose, onNotification }) {
  const [mode, setMode] = useState(null) // null, 'customer-service', 'damaged-parcel'
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup: stop video stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageData)
      stopCamera()
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleSubmit = async () => {
    if (!capturedImage) {
      alert('Please capture a photo of the damaged parcel')
      return
    }

    if (!comment.trim()) {
      alert('Please describe the damage')
      return
    }

    setLoading(true)
    try {
      const result = await detectParcelDamage(capturedImage, comment)
      setAssessment(result.assessment)
      setSubmitted(true)

      // Create notification
      const notification = {
        id: Date.now(),
        type: 'complaint',
        title: 'Damage Assessment Complete',
        message: result.assessment.reasoning || 'Your complaint has been reviewed.',
        assessment: result.assessment,
        timestamp: new Date().toISOString(),
        read: false
      }

      if (onNotification) {
        onNotification(notification)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    stopCamera()
    setMode(null)
    setCapturedImage(null)
    setComment('')
    setSubmitted(false)
    setAssessment(null)
    onClose()
  }

  if (!show) return null

  return (
    <div className="complaint-modal-overlay" onClick={handleClose}>
      <div className="complaint-modal" onClick={(e) => e.stopPropagation()}>
        <div className="complaint-modal-header">
          <h2 className="complaint-modal-title">Complain</h2>
          <button className="complaint-modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="complaint-modal-content">
          {!mode ? (
            <div className="complaint-options">
              <button
                className="complaint-option-button"
                onClick={() => setMode('customer-service')}
              >
                Talk to Customer Representative
              </button>
              <button
                className="complaint-option-button"
                onClick={() => {
                  setMode('damaged-parcel')
                  startCamera()
                }}
              >
                Return Damaged Parcel
              </button>
            </div>
          ) : mode === 'customer-service' ? (
            <div className="customer-service-view">
              <p>Customer service chat will be available here.</p>
              <button className="complaint-back-button" onClick={() => setMode(null)}>
                ← Back
              </button>
            </div>
          ) : (
            <div className="damaged-parcel-view">
              {!submitted ? (
                <>
                  <div className="camera-container">
                    {!capturedImage ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="camera-video"
                        />
                        <div className="camera-controls">
                          <button className="camera-capture-button" onClick={capturePhoto}>
                            📷 Capture Photo
                          </button>
                          <button className="camera-cancel-button" onClick={stopCamera}>
                            Cancel
                          </button>
                        </div>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                      </>
                    ) : (
                      <div className="captured-image-container">
                        <img src={capturedImage} alt="Captured" className="captured-image" />
                        <button className="retake-button" onClick={retakePhoto}>
                          Retake Photo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="comment-section">
                    <label className="comment-label">Describe the damage:</label>
                    <textarea
                      className="comment-textarea"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Describe what's wrong with the parcel..."
                      rows={4}
                    />
                  </div>

                  <div className="submit-section">
                    <button
                      className="submit-button"
                      onClick={handleSubmit}
                      disabled={loading || !capturedImage || !comment.trim()}
                    >
                      {loading ? 'Analyzing...' : 'Submit for AI Review'}
                    </button>
                    <button className="complaint-back-button" onClick={() => {
                      stopCamera()
                      setMode(null)
                      setCapturedImage(null)
                    }}>
                      ← Back
                    </button>
                  </div>
                </>
              ) : (
                <div className="assessment-result">
                  <h3>AI Assessment Complete</h3>
                  {assessment && (
                    <div className="assessment-details">
                      <div className={`assessment-status ${assessment.is_damaged ? 'damaged' : 'not-damaged'}`}>
                        {assessment.is_damaged ? '✓ Damage Detected' : '✗ No Damage Detected'}
                      </div>
                      <div className="assessment-info">
                        <p><strong>Severity:</strong> {assessment.damage_severity}</p>
                        <p><strong>Type:</strong> {assessment.damage_type}</p>
                        <p><strong>Assessment:</strong> {assessment.reasoning}</p>
                        <p><strong>Recommendation:</strong> {
                          assessment.recommendation === 'approve_return' ? 'Return Approved' :
                          assessment.recommendation === 'reject_return' ? 'Return Rejected' :
                          'Needs Manual Review'
                        }</p>
                      </div>
                    </div>
                  )}
                  <button className="complaint-close-button" onClick={handleClose}>
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComplaintModal


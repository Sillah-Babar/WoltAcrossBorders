import React, { Suspense, useMemo, useEffect, useRef, useState } from 'react'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import * as THREE from 'three'
import Header from './Header'
import AuthModal from './AuthModal'
import './LandingPage.css'

function Model({ startAnimation }) {
  const obj = useLoader(OBJLoader, '/models/character.obj')
  const meshRef = useRef()
  const glowRef = useRef()
  const pinkGlowRef = useRef()
  const reachedMiddleRef = useRef(false)
  const middleReachedTimeRef = useRef(0)
  const rotationCompleteRef = useRef(false)
  
  // Debug: log the loaded object structure
  useEffect(() => {
    if (obj) {
      console.log('Loaded OBJ:', obj)
      console.log('Children:', obj.children)
      obj.traverse((child) => {
        console.log('Child:', child, 'Type:', child.constructor.name)
        if (child.geometry) {
          console.log('Geometry:', child.geometry, 'Vertices:', child.geometry.attributes.position?.count)
        }
      })
    }
  }, [obj])
  
  // Create material without textures - simple blue color
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4a9eff',
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide,
    })
  }, [])

  // Animate character slowly rising from beneath, pause in middle, then rotate once
  useFrame((state, delta) => {
    if (meshRef.current && startAnimation) {
      const targetY = -1
      const currentY = meshRef.current.position.y
      const currentTime = state.clock.elapsedTime
      
      // First, slowly rise to target position
      if (currentY < targetY - 0.01) {
        // Still rising - use smooth interpolation
        const distanceToTarget = targetY - currentY
        const speed = Math.min(distanceToTarget * 2, delta * 0.8)
        meshRef.current.position.y = currentY + speed
      } else if (!reachedMiddleRef.current) {
        // Just reached middle - record the time and mark as reached
        reachedMiddleRef.current = true
        middleReachedTimeRef.current = currentTime
        meshRef.current.position.y = targetY
      } else {
        // Check if 1 second has passed since reaching middle
        const timeSinceMiddle = currentTime - middleReachedTimeRef.current
        if (timeSinceMiddle >= 1.0 && !rotationCompleteRef.current) {
          // After 1 second pause, rotate once (360 degrees)
          const rotationTime = timeSinceMiddle - 1.0
          const rotationDuration = 2.0 // 2 seconds for full rotation
          
          if (rotationTime < rotationDuration) {
            // Rotate smoothly over 2 seconds
            const rotationProgress = rotationTime / rotationDuration
            // Apply rotation to the object - traverse to find all meshes
            if (meshRef.current) {
              const targetRotation = rotationProgress * Math.PI * 2
              if (meshRef.current.object) {
                meshRef.current.object.rotation.y = targetRotation
                meshRef.current.object.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    child.rotation.y = targetRotation
                  }
                })
              } else {
                meshRef.current.rotation.y = targetRotation
                if (meshRef.current.traverse) {
                  meshRef.current.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                      child.rotation.y = targetRotation
                    }
                  })
                }
              }
            }
          } else {
            // Rotation complete - stop at final position
            const finalRotation = Math.PI * 2
            if (meshRef.current) {
              if (meshRef.current.object) {
                meshRef.current.object.rotation.y = finalRotation
                meshRef.current.object.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    child.rotation.y = finalRotation
                  }
                })
              } else {
                meshRef.current.rotation.y = finalRotation
                if (meshRef.current.traverse) {
                  meshRef.current.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                      child.rotation.y = finalRotation
                    }
                  })
                }
              }
            }
            rotationCompleteRef.current = true
          }
        } else if (rotationCompleteRef.current) {
          // After rotation, keep character still at middle
          meshRef.current.position.y = targetY
        } else {
          // Still in pause period - keep at target position
          meshRef.current.position.y = targetY
        }
      }
    }
    
    // Animate glow intensity
    if (glowRef.current && startAnimation) {
      glowRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3
    }
    
    // Animate pink glow intensity behind
    if (pinkGlowRef.current && startAnimation) {
      pinkGlowRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.5
    }
  })

  // Process the object
  const processedObj = useMemo(() => {
    if (!obj) return null
    
    // Clone the object
    const cloned = obj.clone()
    let hasValidMesh = false
    
    // Process all meshes in the object
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        hasValidMesh = true
        child.material = material
        child.castShadow = true
        child.receiveShadow = true
        if (child.geometry) {
          // Ensure geometry has UV coordinates for texture mapping
          if (!child.geometry.attributes.uv || child.geometry.attributes.uv.count === 0) {
            // If no UVs, compute them (though OBJ should have them)
            child.geometry.computeVertexNormals()
            // Try to generate basic UVs if missing
            if (!child.geometry.attributes.uv) {
              child.geometry.setAttribute('uv', new THREE.BufferAttribute(
                new Float32Array(child.geometry.attributes.position.count * 2), 2
              ))
            }
          }
          // Ensure normals exist
          if (!child.geometry.attributes.normal || child.geometry.attributes.normal.count === 0) {
            child.geometry.computeVertexNormals()
          }
        }
      }
    })
    
    // If we found valid meshes, return the cloned object
    if (hasValidMesh) {
      return cloned
    }
    
    // If no meshes found, check if children have geometry we can use
    if (cloned.children.length > 0) {
      const geometries = []
      cloned.traverse((child) => {
        if (child.geometry) {
          geometries.push(child.geometry)
        }
      })
      
      if (geometries.length > 0) {
        // Merge all geometries if multiple found
        const mergedGeometry = geometries.length === 1 
          ? geometries[0] 
          : new THREE.BufferGeometry()
        
        if (geometries.length > 1) {
          // Merge multiple geometries
          const merged = new THREE.BufferGeometry()
          const positions = []
          const normals = []
          
          geometries.forEach(geo => {
            if (geo.attributes.position) {
              const pos = geo.attributes.position.array
              positions.push(...pos)
            }
            if (geo.attributes.normal) {
              const norm = geo.attributes.normal.array
              normals.push(...norm)
            }
          })
          
          if (positions.length > 0) {
            merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          }
          if (normals.length > 0) {
            merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
          } else {
            merged.computeVertexNormals()
          }
          
          const mesh = new THREE.Mesh(merged, material)
          mesh.castShadow = true
          mesh.receiveShadow = true
          return mesh
        } else {
          const mesh = new THREE.Mesh(mergedGeometry, material)
          mesh.castShadow = true
          mesh.receiveShadow = true
          if (!mesh.geometry.attributes.normal || mesh.geometry.attributes.normal.count === 0) {
            mesh.geometry.computeVertexNormals()
          }
          return mesh
        }
      }
    }
    
    return null
  }, [obj, material])

  // Fallback: show a cube if model fails to load or process
  if (!processedObj) {
    console.warn('No processed object, showing fallback cube')
    return (
      <>
        <mesh ref={meshRef} position={[0, -5, 0]} scale={[1.8, 1.8, 1.8]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color="#4a9eff"
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
        {/* Pink glow light behind - enhanced */}
        <pointLight 
          ref={pinkGlowRef}
          position={[0, -1, -3]} 
          intensity={2.5}
          color="#ff69b4"
          distance={10}
          decay={1.2}
        />
        {/* Additional pink glow for more visibility */}
        <pointLight 
          position={[0, 0, -4]} 
          intensity={1.5}
          color="#ff1493"
          distance={8}
          decay={1.5}
        />
      </>
    )
  }

  console.log('Rendering processed object:', processedObj)
  return (
    <>
      <primitive 
        ref={meshRef}
        object={processedObj} 
        scale={[1.8, 1.8, 1.8]} 
        position={[0, -5, 0]}
        rotation={[0, 0, 0]}
      />
      {/* Bottom glow light */}
      <pointLight 
        ref={glowRef}
        position={[0, -3, 0]} 
        intensity={1}
        color="#4a9eff"
        distance={10}
        decay={2}
      />
      {/* Pink glow light behind - enhanced */}
      <pointLight 
        ref={pinkGlowRef}
        position={[0, -1, -3]} 
        intensity={2.5}
        color="#ff69b4"
        distance={10}
        decay={1.2}
      />
      {/* Additional pink glow for more visibility */}
      <pointLight 
        position={[0, 0, -4]} 
        intensity={1.5}
        color="#ff1493"
        distance={8}
        decay={1.5}
      />
    </>
  )
}

function Scene({ startAnimation }) {
  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 5, -5]} intensity={0.8} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      <Suspense fallback={
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#4a9eff" wireframe />
        </mesh>
      }>
        <Model startAnimation={startAnimation} />
        <Environment preset="sunset" />
      </Suspense>
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        minDistance={3}
        maxDistance={10}
      />
    </>
  )
}

function LandingPage({ onEnter, user, onSignOut }) {
  const [startAnimation, setStartAnimation] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('signin')

  useEffect(() => {
    // Start character animation immediately
    setStartAnimation(true)
  }, [])

  const handleSignInClick = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  const handleSignUpClick = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
  }

  return (
    <div className="landing-page">
      <Header user={user} onSignOut={onSignOut} hideSignIn={true} />
      <div className="landing-content">
        <div className="landing-3d">
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Scene startAnimation={startAnimation} />
          </Canvas>
          {/* Bottom glow effect overlay */}
          <div className="bottom-glow"></div>
        </div>
        <div className="landing-actions">
          <button className="landing-button sign-in-landing" onClick={handleSignInClick}>
            Sign In
          </button>
          <button className="landing-button sign-up-landing" onClick={handleSignUpClick}>
            Sign Up
          </button>
        </div>
      </div>
      
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
        />
      )}
    </div>
  )
}

export default LandingPage


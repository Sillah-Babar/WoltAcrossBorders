import React, { Suspense, useMemo, useEffect, useRef } from 'react'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import './DeliveryConfirmation.css'

// Character Model Component
function CharacterModel() {
  const obj = useLoader(OBJLoader, '/models/character.obj')
  const meshRef = useRef()
  const glowRef = useRef()
  const pinkGlowRef = useRef()
  
  // Create material - simple blue color
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4a9eff',
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide,
    })
  }, [])

  // Animate character levitating smoothly
  useFrame((state) => {
    if (meshRef.current) {
      // Smooth levitation using sine wave
      const levitationSpeed = 0.5
      const levitationAmplitude = 0.15
      const time = state.clock.elapsedTime
      meshRef.current.position.y = -1 + Math.sin(time * levitationSpeed) * levitationAmplitude
    }
    
    // Animate glow intensity
    if (glowRef.current) {
      glowRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3
    }
    
    // Animate pink glow intensity behind
    if (pinkGlowRef.current) {
      pinkGlowRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.5
    }
  })

  // Clone and setup the model
  const clonedObj = useMemo(() => {
    if (!obj) return null
    const clone = obj.clone()
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
        child.castShadow = true
        child.receiveShadow = true
        if (child.geometry) {
          if (!child.geometry.attributes.normal || child.geometry.attributes.normal.count === 0) {
            child.geometry.computeVertexNormals()
          }
        }
      }
    })
    return clone
  }, [obj, material])

  if (!clonedObj) {
    // Fallback cube if model fails to load
    return (
      <group ref={meshRef} position={[0, -1, 0]} scale={[1.8, 1.8, 1.8]}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color="#4a9eff"
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
        <pointLight
          ref={glowRef}
          position={[0, -2, 0]}
          color="#4a9eff"
          intensity={1}
          distance={5}
          decay={2}
        />
        <pointLight
          ref={pinkGlowRef}
          position={[0, -1, -1]}
          color="#ff69b4"
          intensity={2}
          distance={5}
          decay={2}
        />
      </group>
    )
  }

  return (
    <group ref={meshRef} position={[0, -1, 0]} scale={[1.8, 1.8, 1.8]}>
      <primitive object={clonedObj} />
      {/* Bottom glow */}
      <pointLight
        ref={glowRef}
        position={[0, -2, 0]}
        color="#4a9eff"
        intensity={1}
        distance={5}
        decay={2}
      />
      {/* Pink glow behind */}
      <pointLight
        ref={pinkGlowRef}
        position={[0, -1, -1]}
        color="#ff69b4"
        intensity={2}
        distance={5}
        decay={2}
      />
    </group>
  )
}

// Wolt Bag Component with party popper animation
function WoltBag({ bagModel, textures, position, scale, delay, direction }) {
  const meshRef = useRef()
  const startTimeRef = useRef(null)
  const startPosition = useRef(new THREE.Vector3(0, -1, 0)) // Start at character position
  const targetPosition = useRef(new THREE.Vector3(...position))
  const initialScale = useRef(scale)
  const maxScale = useRef(scale * 3) // Start 3x bigger

  // Create material with textures
  const material = useMemo(() => {
    if (!textures) {
      return new THREE.MeshStandardMaterial({
        color: '#ffffff',
        metalness: 0.2,
        roughness: 0.6,
        side: THREE.DoubleSide,
      })
    }

    const mat = new THREE.MeshStandardMaterial({
      map: textures.diffuse,
      normalMap: textures.normal,
      metalnessMap: textures.metallic,
      roughnessMap: textures.roughness,
      metalness: 1.0,
      roughness: 1.0,
      side: THREE.DoubleSide,
    })

    // Set texture properties
    if (textures.diffuse) {
      textures.diffuse.colorSpace = THREE.SRGBColorSpace
      textures.diffuse.wrapS = THREE.ClampToEdgeWrapping
      textures.diffuse.wrapT = THREE.ClampToEdgeWrapping
    }
    if (textures.normal) {
      textures.normal.wrapS = THREE.ClampToEdgeWrapping
      textures.normal.wrapT = THREE.ClampToEdgeWrapping
    }
    if (textures.metallic) {
      textures.metallic.wrapS = THREE.ClampToEdgeWrapping
      textures.metallic.wrapT = THREE.ClampToEdgeWrapping
    }
    if (textures.roughness) {
      textures.roughness.wrapS = THREE.ClampToEdgeWrapping
      textures.roughness.wrapT = THREE.ClampToEdgeWrapping
    }

    return mat
  }, [textures])

  // Clone and setup the bag model
  const clonedBag = useMemo(() => {
    if (!bagModel) return null
    const clone = bagModel.clone()
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
        child.castShadow = true
        child.receiveShadow = true
        if (child.geometry) {
          if (!child.geometry.attributes.normal || child.geometry.attributes.normal.count === 0) {
            child.geometry.computeVertexNormals()
          }
        }
      }
    })
    return clone
  }, [bagModel, material])

  // Party popper animation - start big, shrink as they disperse, fade out at end
  useFrame((state) => {
    if (!meshRef.current || !clonedBag) return
    
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime + delay
    }
    
    const elapsed = state.clock.elapsedTime - startTimeRef.current
    
    if (elapsed >= 0) {
      const animationDuration = 2.0 // Total animation time
      const progress = Math.min(elapsed / animationDuration, 1)
      
      // Ease out function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      // Position: move from center outward with angled trajectory
      const currentPos = new THREE.Vector3()
      currentPos.lerpVectors(startPosition.current, targetPosition.current, easeOut)
      
      // Add angled throw trajectory (parabolic arc)
      const throwAngle = progress
      const arcHeight = Math.sin(throwAngle * Math.PI) * 1.5 // Higher arc
      const horizontalBoost = Math.sin(throwAngle * Math.PI) * 0.3 // Forward momentum
      
      // Apply angled trajectory
      const directionVec = new THREE.Vector3(...direction).normalize()
      currentPos.add(directionVec.multiplyScalar(horizontalBoost))
      currentPos.y += arcHeight
      
      meshRef.current.position.copy(currentPos)
      
      // Scale: start big (3x), shrink to final size as they disperse
      const scaleProgress = easeOut
      const currentScale = maxScale.current + (initialScale.current - maxScale.current) * scaleProgress
      meshRef.current.scale.set(currentScale, currentScale, currentScale)
      
      // Rotation: spin as they fly out
      meshRef.current.rotation.y += 0.08
      meshRef.current.rotation.x += 0.05
      meshRef.current.rotation.z = Math.cos(elapsed * 2.5) * 0.2
      
      // Fade out as they reach the end (last 30% of animation)
      if (progress > 0.7) {
        const fadeProgress = (progress - 0.7) / 0.3 // 0 to 1 over last 30%
        const opacity = 1 - fadeProgress
        if (meshRef.current.children && meshRef.current.children.length > 0) {
          meshRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              child.material.opacity = opacity
              child.material.transparent = true
            }
          })
        }
      } else {
        // Ensure fully visible during most of animation
        meshRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.opacity = 1
            child.material.transparent = true
          }
        })
      }
      
      // Hide completely when animation is done
      if (progress >= 1) {
        meshRef.current.visible = false
      }
    } else {
      // Before animation starts, position at center with max scale
      meshRef.current.position.copy(startPosition.current)
      meshRef.current.scale.set(maxScale.current, maxScale.current, maxScale.current)
      meshRef.current.visible = true
    }
  })

  if (!clonedBag) return null

  return (
    <group ref={meshRef} position={startPosition.current} scale={maxScale.current}>
      <primitive object={clonedBag} />
    </group>
  )
}

// Generate random bag positions around the screen (party popper style)
function generateBagPositions(count) {
  const positions = []
  const sizes = [0.3, 0.35, 0.4, 0.45, 0.5] // Final sizes (will start bigger)
  
  for (let i = 0; i < count; i++) {
    // Angled throw positions - more horizontal spread
    const angle = (i / count) * Math.PI * 2
    const horizontalAngle = angle + (Math.random() - 0.5) * 0.8 // Spread horizontally
    const verticalAngle = (Math.random() - 0.3) * Math.PI * 0.4 // Slight upward angle
    const radius = 4 + Math.random() * 1.5 // Further out
    
    // Calculate position with angled throw
    const x = Math.cos(horizontalAngle) * radius
    const y = Math.sin(verticalAngle) * radius * 0.5 - 1 // Angled upward
    const z = Math.sin(horizontalAngle) * radius
    
    const size = sizes[Math.floor(Math.random() * sizes.length)]
    const delay = i * 0.08 + Math.random() * 0.1 // Sequential appearance
    
    // Direction vector for angled throw
    const direction = new THREE.Vector3(x, y, z).normalize()
    
    positions.push({
      position: [x, y, z],
      scale: size,
      delay: delay,
      direction: [direction.x, direction.y, direction.z]
    })
  }
  
  return positions
}

function BagContainer({ bagPositions }) {
  // Load bag model once
  const bagObj = useLoader(OBJLoader, '/wolt_bag/base.obj')
  
  // Load textures
  const diffuseTexture = useLoader(TextureLoader, '/wolt_bag/texture_diffuse.png')
  const normalTexture = useLoader(TextureLoader, '/wolt_bag/texture_normal.png')
  const metallicTexture = useLoader(TextureLoader, '/wolt_bag/texture_metallic.png')
  const roughnessTexture = useLoader(TextureLoader, '/wolt_bag/texture_roughness.png')

  const textures = useMemo(() => ({
    diffuse: diffuseTexture,
    normal: normalTexture,
    metallic: metallicTexture,
    roughness: roughnessTexture
  }), [diffuseTexture, normalTexture, metallicTexture, roughnessTexture])

  return (
    <>
      {bagPositions.map((bag, index) => (
        <WoltBag
          key={index}
          bagModel={bagObj}
          textures={textures}
          position={bag.position}
          scale={bag.scale}
          delay={bag.delay}
          direction={bag.direction}
        />
      ))}
    </>
  )
}

function Scene() {
  const bagPositions = useMemo(() => generateBagPositions(6), [])
  
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4a9eff" />
      <Suspense fallback={null}>
        <CharacterModel />
        <BagContainer bagPositions={bagPositions} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
      <Environment preset="sunset" />
    </Canvas>
  )
}

function DeliveryConfirmation({ onComplete }) {
  useEffect(() => {
    // Auto-navigate after 8 seconds
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete()
      }
    }, 8000)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="delivery-confirmation-overlay">
      <div className="delivery-confirmation-content">
        <div className="delivery-3d-container">
          <Scene />
        </div>
        <div className="delivery-message">
          <h2 className="delivery-message-title">Your delivery will be here in 30 minutes!</h2>
          <p className="delivery-message-subtitle">Thank you for your order</p>
        </div>
      </div>
    </div>
  )
}

export default DeliveryConfirmation


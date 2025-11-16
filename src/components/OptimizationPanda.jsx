import React, { Suspense, useMemo, useRef } from 'react'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import * as THREE from 'three'
import './OptimizationPanda.css'

function RotatingPanda({ modelPath, color }) {
  const obj = useLoader(OBJLoader, modelPath)
  const meshRef = useRef()
  
  // Create material with color
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide,
    })
  }, [color])

  // Clone and setup the model
  const clonedObj = useMemo(() => {
    if (!obj) return null
    const clone = obj.clone()
    
    // Calculate bounding box to normalize size
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 1.5 / maxDim // Normalize to consistent size
    
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
    
    // Apply normalization scale
    clone.scale.multiplyScalar(scale)
    
    return clone
  }, [obj, material])

  // Rotate the panda
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })

  if (!clonedObj) {
    // Fallback sphere
    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
    )
  }

  return (
    <group ref={meshRef} scale={[1.2, 1.2, 1.2]} position={[0, -0.5, 0]}>
      <primitive object={clonedObj} />
    </group>
  )
}

function PandaScene({ modelPath, color }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 50 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color={color} />
      <Suspense fallback={null}>
        <RotatingPanda modelPath={modelPath} color={color} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </Canvas>
  )
}

function OptimizationPanda({ type, onSelect, isSelected }) {
  const modelPath = type === 'healthy' 
    ? '/blob_variants/healthPanda.obj'
    : '/blob_variants/moneySaver.obj'
  
  const color = type === 'healthy' ? '#4a9eff' : '#ec4899' // Blue for healthy, pink for money
  const title = type === 'healthy' ? 'healthy Yuho' : 'Money Saver'
  const description = type === 'healthy' 
    ? 'Optimize for balanced nutrition' 
    : 'Save money on your order'

  return (
    <div className={`optimization-panda-card ${isSelected ? 'selected' : ''} ${type === 'money' ? 'money-saver' : 'healthy-Yuho'}`}>
      <div className="optimization-panda-3d">
        <PandaScene modelPath={modelPath} color={color} />
      </div>
      <button 
        className={`optimization-panda-button ${type === 'money' ? 'money-button' : 'healthy-button'}`}
        onClick={onSelect}
      >
        {title}
      </button>
      <p className="optimization-panda-description">{description}</p>
    </div>
  )
}

export default OptimizationPanda


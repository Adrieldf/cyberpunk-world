'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type Faction = 'Syndicate' | 'Zenith' | 'Glitch'

interface TowerProps {
  faction: Faction
  position?: [number, number, number]
}

export function Tower({ faction, position = [0, 0, 0] }: TowerProps) {
  // Base properties
  const height = 8
  const radius = 1.5
  
  // Materials and emissive colors based on faction
  let color = '#222222'
  let roughness = 0.5
  let metalness = 0.5
  let emissive = '#000000'
  
  switch (faction) {
    case 'Syndicate':
      color = '#2a2a2a' // Dark grey
      roughness = 0.9 // Rough
      metalness = 0.2
      emissive = '#ff003c' // Red (from cyberpunk theme)
      break
    case 'Zenith':
      color = '#0a0a0a' // Sleek black
      roughness = 0.1 // Shiny
      metalness = 0.9 // High metallicity for sleekness
      emissive = '#00ffff' // Blue/Cyan (from cyberpunk theme)
      break
    case 'Glitch':
      color = '#111111' // Dark base
      roughness = 0.7
      metalness = 0.5
      emissive = '#b026ff' // Purple (from cyberpunk theme)
      break
  }

  const groupRef = useRef<THREE.Group>(null)
  const auraRef = useRef<THREE.Mesh>(null)

  // Optional subtle animation for the Glitch aura
  useFrame((state, delta) => {
    if (faction === 'Glitch' && auraRef.current) {
      auraRef.current.rotation.y += delta * 0.5
      auraRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.05
    }
  })

  return (
    <group position={position} ref={groupRef}>
      {/* Main Tower Cylinder */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 32]} />
        <meshStandardMaterial 
          color={color} 
          roughness={roughness} 
          metalness={metalness} 
        />
      </mesh>

      {/* Faction Emissive Accents (Glowing Rings) */}
      <mesh position={[0, height * 0.8, 0]}>
        <cylinderGeometry args={[radius * 1.05, radius * 1.05, 0.2, 32]} />
        <meshStandardMaterial 
          color="#000000"
          emissive={emissive}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      
      <mesh position={[0, height * 0.2, 0]}>
        <cylinderGeometry args={[radius * 1.05, radius * 1.05, 0.1, 32]} />
        <meshStandardMaterial 
          color="#000000"
          emissive={emissive}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Glitch faction wireframe aura */}
      {faction === 'Glitch' && (
        <mesh position={[0, height / 2, 0]} ref={auraRef}>
          {/* Slightly thicker and taller than the main cylinder */}
          <cylinderGeometry args={[radius * 1.3, radius * 1.3, height + 1, 16]} />
          <meshStandardMaterial 
            color={emissive}
            emissive={emissive}
            emissiveIntensity={1.5}
            wireframe={true}
            transparent={true}
            opacity={0.4}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}

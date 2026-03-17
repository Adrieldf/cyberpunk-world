'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { CountryData } from '@/hooks/useCountries'

interface CountryMarkerProps {
  country: CountryData
  position: [number, number, number]
  onJoin: (id: string) => void
  isAnyFocused: boolean
  isFocused: boolean
  onFocus: () => void
}

export function CountryMarker({ country, position, onJoin, isAnyFocused, isFocused, onFocus }: CountryMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [isZoomedOut, setIsZoomedOut] = useState(true)
  const [hidden, setHidden] = useState(false)

  // Compute a quaternion so the 3D structures always point OUTWARD from the center of the Earth!
  const quaternion = useMemo(() => {
    const normal = new THREE.Vector3(...position).normalize()
    const q = new THREE.Quaternion()
    // We build our 3D items extending upward via the Y-axis. 
    // This perfectly aligns the local Y-axis with the spherical surface normal.
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    return q
  }, [position])

  // 1. Calculate dimensions logically based on game population scale (0 to ~150+)
  const popScale = Math.sqrt(Math.max(country.population, 0)) // For ~140 (China/India), this is ~11.8.
  
  // Base values for small countries, scaling up for high population ones
  const buildingHeight = 0.5 + popScale * 0.1 
  const zoneRadius = 0.25 + popScale * 0.05 
  
  // Use the database-defined neon color assigned to this specific country based on its region
  const color = country.color || '#00ffff' 

  // 2. The DYNAMIC LOD SYSTEM & VISIBILITY
  useFrame((state) => {
    // LOD Logic
    const camDistance = state.camera.position.length()
    const zoomedOutThreshold = 45 
    
    // Always render 3D if we are explicitly focused on this country!
    if (isFocused) {
        setIsZoomedOut(false)
    } else if (camDistance > zoomedOutThreshold && !isZoomedOut) {
      setIsZoomedOut(true)
    } else if (camDistance <= zoomedOutThreshold && isZoomedOut) {
      setIsZoomedOut(false)
    }

    // Visibility logic: Hide if the marker is on the other side of the planet
    const markerNormal = new THREE.Vector3(...position).normalize()
    const cameraDir = state.camera.position.clone().sub(new THREE.Vector3(...position)).normalize()
    
    const isFacing = markerNormal.dot(cameraDir) > 0.1 

    // Culling logic: If zoomed out, hide the labels of minor countries to prevent UI clutter
    const isFarOut = camDistance > zoomedOutThreshold
    const isSignificant = country.population > 0
    const isCulledByDistance = isFarOut && !isSignificant
    
    // Focus Culling: If the camera is intensely focused on one country, cull the UI (but not the 3D meshes) of all other countries
    const isCulledByFocus = isAnyFocused && !isFocused

    const shouldBeHidden = !isFacing || isCulledByDistance || isCulledByFocus

    if (hidden !== shouldBeHidden) {
      setHidden(shouldBeHidden)
    }
  })

  // 3. Generate a crude little "capital block" mesh if we are zoomed in
  const buildings = useMemo(() => {
    const b = []
    // Center mega-skyscraper
    b.push(
      <mesh key="core" position={[0, buildingHeight / 2, 0]}>
        <boxGeometry args={[0.3, buildingHeight, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </mesh>
    )

    // Generate an expanding city block based on game population size
    // Since game population scales ~0 to ~150, we add roughly 1 building per 2.5 population points
    const numBuildings = Math.max(1, Math.min(Math.floor(country.population / 2.5), 60))

    if (country.population > 0) {
        for(let i=0; i<numBuildings; i++) {
            // Deterministic pseudo-randomness based exactly on country name and building index
            const seed = country.name.charCodeAt(0) + i * 133.7
            
            // Randomly scatter outwards, large populations get a sprawling massive urban radius
            const maxScatter = 0.2 + popScale * 0.08
            const r = 0.2 + ((seed % 100) / 100) * maxScatter 
            
            // Radially cycle around the core tower (golden angle approximation)
            const angle = seed * 1.618 
            
            // Buildings become taller proportionally to the country's core tower 
            const h = buildingHeight * (0.1 + (seed % 60) / 100)
            
            const rx = Math.cos(angle) * r
            const rz = Math.sin(angle) * r
            const thickness = 0.05 + (seed % 10) / 100
            
            b.push(
                <mesh key={`sat-${i}`} position={[rx, h / 2, rz]}>
                    <boxGeometry args={[thickness, h, thickness]} />
                    <meshStandardMaterial color="#333" roughness={0.8} metalness={0.2} />
                </mesh>
            )
        }
    }
    return b
  }, [buildingHeight, country.population, color, country.name, popScale])

  // 4. Label Layout
  // Center labels directly above the country's main structure for clarity
  const labelPos = useMemo(() => {
    return [0, buildingHeight + 0.5, 0] as [number, number, number]
  }, [buildingHeight])

  return (
    // Instead of raw rotations, we apply the quaternion which maps the local Y-axis straight outward!
    // We also give it a slight physical hover offset of 0.05 on position so the base floor rings don't z-fight with the Earth mesh!
    <group position={position} quaternion={quaternion} ref={groupRef}>
      
      {/* 2D TACTICAL VIEW (Large flat glowing rings designating zone control) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[zoneRadius * 0.9, zoneRadius, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      
      {/* Ghostly inner fill for the zone */}
       <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[zoneRadius, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>

      {/* 3D CAPITAL VIEW (Only renders when zoomed in tightly) */}
      {!isZoomedOut && (
         <group>
             {buildings}
             
             {/* Neon Glow cap on the main building */}
             <mesh position={[0, buildingHeight + 0.1, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
                <meshBasicMaterial color={color} toneMapped={false} />
             </mesh>
         </group>
      )}

      {/* HTML OVERLAY LABELS */}
      <Html 
        position={isZoomedOut ? [0, 0, 0] : labelPos} 
        center 
        distanceFactor={isZoomedOut ? 30 : 15}
        zIndexRange={[100, 0]}
        style={{ 
          transition: 'all 0.4s ease-in-out', 
          opacity: hidden ? 0 : 1, 
          // If culled by focus, completely disable interaction. Otherwise leave auto.
          pointerEvents: hidden ? 'none' : 'auto', 
          transform: `scale(${hidden ? 0.5 : 1})`
        }}
      >
        <div className="flex flex-col items-center transition-transform hover:scale-110 group">
          <div 
            onClick={onFocus}
            className="bg-black/80 backdrop-blur border border-white/20 text-white font-mono px-3 py-1 rounded-sm shadow-neon-secondary text-xs whitespace-nowrap cursor-pointer hover:bg-white/10 hover:border-white transition-colors"
          >
            {country.name}
          </div>
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="bg-white text-black font-bold text-[10px] px-1 rounded-sm flex items-center">
                POP {country.population.toLocaleString()}
             </span>
             <button 
                onClick={(e) => { e.stopPropagation(); onJoin(country.id); }}
                className="bg-primary/20 text-primary border border-primary text-[10px] font-bold px-2 rounded-sm hover:bg-primary hover:text-white transition-colors uppercase cursor-pointer"
             >
                Join
             </button>
          </div>
        </div>
      </Html>
    </group>
  )
}

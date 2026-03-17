'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { CityData } from '@/hooks/useCities'

interface CityMarkerProps {
  city: CityData
  position: [number, number, number]
  onJoin: (id: string) => void
}

export function CityMarker({ city, position, onJoin }: CityMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  // State for Level of Detail (LOD) handling based on camera height!
  const [isZoomedOut, setIsZoomedOut] = useState(true)

  // 1. Calculate dimensions logically based on population
  // The larger the population, the bigger the zone and the taller the buildings!
  const populationScale = Math.max(1, Math.min(city.population, 100) / 10)
  const zoneRadius = 0.5 + populationScale * 0.2 // Max radius around 2.5
  const buildingHeight = 0.2 + populationScale * 1 // Max height around 10
  
  // Choose neon colors based on population tiers (could be randomly assigned or faction based later)
  const isMegaCity = city.population > 50
  const color = isMegaCity ? '#ff00ff' : '#00ffff' // Magenta for mega cities, Cyan otherwise

  // 2. The DYNAMIC LOD SYSTEM
  // We check the camera's Y position every frame. 
  // If the user zooms out past Y=15, we switch to a flat 2D tactical map.
  // If they zoom in closer than Y=15, 3D structures pop out of the ground!
  useFrame((state) => {
    const camHeight = state.camera.position.y
    const zoomedOutThreshold = 30 
    
    if (camHeight > zoomedOutThreshold && !isZoomedOut) {
      setIsZoomedOut(true)
    } else if (camHeight <= zoomedOutThreshold && isZoomedOut) {
      setIsZoomedOut(false)
    }
  })

  // 3. Generate a crude little "city block" mesh if we are zoomed in
  // We memoize it so we aren't creating arrays 60 times a second
  const buildings = useMemo(() => {
    const b = []
    // Center mega-skyscraper
    b.push(
      <mesh key="core" position={[0, buildingHeight / 2, 0]}>
        <boxGeometry args={[0.3, buildingHeight, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </mesh>
    )

    // A few random smaller satellite buildings around it
    if (city.population > 0) {
        for(let i=0; i<3; i++) {
            const h = buildingHeight * (0.3 + Math.random() * 0.4)
            const rx = (Math.random() - 0.5) * 0.8
            const rz = (Math.random() - 0.5) * 0.8
            b.push(
                <mesh key={`sat-${i}`} position={[rx, h / 2, rz]}>
                    <boxGeometry args={[0.15, h, 0.15]} />
                    <meshStandardMaterial color="#333" roughness={0.8} metalness={0.2} />
                </mesh>
            )
        }
    }
    return b
  }, [buildingHeight, city.population, color])

  return (
    <group position={position} ref={groupRef}>
      
      {/* 2D TACTICAL VIEW (Large flat glowing rings designating zone control) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        {/* RingGeometry args: [innerRadius, outerRadius, thetaSegments] */}
        <ringGeometry args={[zoneRadius * 0.9, zoneRadius, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      
      {/* Ghostly inner fill for the zone */}
       <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[zoneRadius, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>

      {/* 3D CITY VIEW (Only renders when zoomed in tightly) */}
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
      {/* Using React Three Drei's HTML to perfectly pin DOM text to 3D coordinates! */}
      <Html 
        position={[0, isZoomedOut ? 0 : buildingHeight, 0]} 
        center 
        distanceFactor={isZoomedOut ? 30 : 15} // Text scales natively with camera distance!
        zIndexRange={[100, 0]}
      >
        <div className="flex flex-col items-center pointer-events-auto mt-4 transition-transform hover:scale-110">
          <div className="bg-black/60 backdrop-blur border border-white/20 text-white font-mono px-3 py-1 rounded-sm shadow-neon-secondary text-xs whitespace-nowrap">
            {city.name}
          </div>
          <div className="flex gap-1 mt-1">
             <span className="bg-white text-black font-bold text-[10px] px-1 rounded-sm">
                POP {city.population.toLocaleString()}
             </span>
             <button 
                onClick={() => onJoin(city.id)}
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

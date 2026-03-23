'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { CountryData } from '@/hooks/useCountries'
import { CyberpunkCity, popToLevel } from './CyberpunkCity'

interface CountryMarkerProps {
  country: CountryData
  position: [number, number, number]
  onJoin: (id: string) => void
  isAnyFocused: boolean
  isFocused: boolean
  onFocus: () => void
}

export function CountryMarker({ country, position, onJoin, isAnyFocused, isFocused, onFocus }: CountryMarkerProps) {
  const groupRef  = useRef<THREE.Group>(null)
  const [isZoomedOut, setIsZoomedOut] = useState(true)
  const [hidden, setHidden]           = useState(false)
  const [camDist, setCamDist]         = useState(60)

  // Align local Y axis outward from sphere surface
  const quaternion = useMemo(() => {
    const normal = new THREE.Vector3(...position).normalize()
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    return q
  }, [position])

  // ── Visual scale from population (log-based, 0-100k range) ──────────────
  const level       = popToLevel(country.population)
  const zoneRadius  = 0.08 + level * 0.67
  const color       = country.color || '#00ffff'

  // ── LOD + visibility ──────────────────────────────────────────────────────
  useFrame((state) => {
    const dist = state.camera.position.length()
    setCamDist(dist)
    const threshold = 45

    if (isFocused) {
      if (isZoomedOut) setIsZoomedOut(false)
    } else if (dist > threshold && !isZoomedOut) {
      setIsZoomedOut(true)
    } else if (dist <= threshold && isZoomedOut) {
      setIsZoomedOut(false)
    }

    // Back-face culling (other side of globe)
    const markerNormal = new THREE.Vector3(...position).normalize()
    const cameraDir    = state.camera.position.clone().sub(new THREE.Vector3(...position)).normalize()
    const isFacing     = markerNormal.dot(cameraDir) > 0.1

    // Hide zero-pop markers when far out
    const isCulledByDistance = dist > threshold && country.population === 0
    // Always hide other countries' labels when any country is focused
    const isCulledByFocus    = isAnyFocused

    const shouldHide = !isFacing || isCulledByDistance || isCulledByFocus
    if (hidden !== shouldHide) setHidden(shouldHide)
  })

  const buildingHeight = 0.03 + level * 1.6

  return (
    <group position={position} quaternion={quaternion} ref={groupRef}>

      {/* ── 2D Tactical ring (orbit view, not focused) ── */}
      {!isFocused && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <ringGeometry args={[zoneRadius * 0.88, zoneRadius, 48]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <circleGeometry args={[zoneRadius, 48]} />
            <meshBasicMaterial color={color} transparent opacity={0.08} />
          </mesh>
        </>
      )}

      {/* ── Cyberpunk city (focused mode only) ── */}
      <CyberpunkCity
        population={country.population}
        color={color}
        seed={country.name}
        isFocused={isFocused}
      />

      {/* ── Orbit name label (hidden in focus mode) ── */}
      {!isAnyFocused && (
        <Html
          position={[0, 0.06, 0]}
          center
          distanceFactor={22}
          zIndexRange={[50, 0]}
          style={{
            transition: 'opacity 0.25s ease',
            opacity: hidden ? 0 : 1,
            pointerEvents: hidden ? 'none' : 'auto',
          }}
        >
          <button
            onClick={onFocus}
            style={{ borderColor: `${color}55`, color }}
            className="
              bg-black/70 backdrop-blur-sm
              border rounded-sm
              font-mono text-[10px] tracking-wider
              px-2 py-[2px]
              whitespace-nowrap cursor-pointer
              hover:bg-white/10 transition-colors
              shadow-[0_0_6px_rgba(0,0,0,0.8)]
            "
          >
            {country.name}
          </button>
        </Html>
      )}
    </group>
  )
}

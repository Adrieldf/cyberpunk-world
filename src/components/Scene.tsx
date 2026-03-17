'use client'

import { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, CameraControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

import { useCountries } from '@/hooks/useCountries'
import { CountryMarker } from './CountryMarker'
import { WorldMapBorders } from './WorldMapBorders'
import { latLngToVector3 } from '@/utils/geo'

function CyberOcean({ radius }: { radius: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
  const shaderArgs = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color("#020510") },
      gridColor: { value: new THREE.Color("#003344") }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform vec3 gridColor;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        // Fast flowing forward grid layout
        vec2 grid = abs(fract(vUv * 60.0 + vec2(time * 0.05, time * 0.15)) - 0.5);
        float line = min(grid.x, grid.y);
        
        // Complex interfering wave patterns for "digital water"
        float wave1 = sin(vPosition.y * 3.0 + time * 1.5);
        float wave2 = cos(vPosition.x * 4.0 - time * 1.0);
        float wave3 = sin(vPosition.z * 2.0 + time * 0.8);
        
        // Combine waves to create turbulence
        float turbulence = (wave1 + wave2 + wave3) * 0.33;
        
        // Dynamic glowing pulses flowing through the grid
        float glow = smoothstep(0.4, 0.5, 0.5 - line) * (turbulence * 0.5 + 0.5);
        
        // Add random digital flashing data "bits" across the ocean lines
        float flash = step(0.98, fract(sin(dot(vUv + time * 0.01, vec2(12.9898, 78.233))) * 43758.5453));
        glow += flash * 0.5 * smoothstep(0.48, 0.5, 0.5 - line);

        gl_FragColor = vec4(mix(baseColor, gridColor, glow), 1.0);
      }
    `
  }), [])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh>
      {/* Increased radius slightly so the markers don't look like they are floating so high above the surface! */}
      <sphereGeometry args={[radius * 0.998, 64, 64]} />
      <shaderMaterial attach="material" ref={materialRef} args={[shaderArgs]} />
    </mesh>
  )
}

function CameraUpdater({ controlsRef, targetUp }: { controlsRef: React.RefObject<CameraControls | null>, targetUp: React.MutableRefObject<THREE.Vector3> }) {
  useFrame((state, delta) => {
    if (controlsRef.current && targetUp.current) {
      const currentUp = controlsRef.current.camera.up
      if (currentUp.distanceTo(targetUp.current) > 0.001) {
        currentUp.lerp(targetUp.current, 5 * delta).normalize()
        controlsRef.current.updateCameraUp()
      }
    }
  })
  return null
}

export function Scene() {
  const { countries, isLoading, joinCountry } = useCountries()
  
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const controlsRef = useRef<CameraControls>(null)
  const targetUp = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0))

  const EARTH_RADIUS = 20

  const handleFocusCountry = (id: string, position: [number, number, number]) => {
    if (focusedId === id) return

    setFocusedId(id)
    
    const target = new THREE.Vector3(...position)
    const normal = target.clone().normalize()
    
    // Smoothly align the camera's Up vector to the country's normal (prevents upside-down views)
    targetUp.current.copy(normal)
    
    const up = new THREE.Vector3(0, 1, 0)
    let tangent = new THREE.Vector3().crossVectors(up, normal).normalize()
    
    // Fallback if normal is completely vertical
    if (tangent.lengthSq() < 0.001) {
      tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), normal).normalize()
    }
    
    // Focus exactly at the bottom center of the town
    const lookAtTarget = target.clone()
    
    // Position the camera close to the surface, offset horizontally
    const camPos = target.clone()
      .add(tangent.multiplyScalar(6))  // 6 units to the side
      .add(normal.clone().multiplyScalar(2.0)) // 2.0 units above ground level (higher initial view)
    
    controlsRef.current?.setLookAt(camPos.x, camPos.y, camPos.z, lookAtTarget.x, lookAtTarget.y, lookAtTarget.z, true)
  }

  const handleResetOrbit = () => {
    setFocusedId(null)
    targetUp.current.set(0, 1, 0)
    // Zoom back out into deep space default orbit
    controlsRef.current?.setLookAt(0, 0, 60, 0, 0, 0, true)
  }

  return (
    <div className="w-full h-screen bg-background relative overflow-hidden">
      
      {/* HUD OVERLAY */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto text-primary font-bold text-4xl tracking-widest text-shadow-neon drop-shadow-md flex flex-col items-start gap-4">
            CYBERPUNK WORLD

            {/* If focused on a country, show a back button! */}
            {focusedId && (
              <button 
                onClick={handleResetOrbit}
                className="text-sm border border-secondary text-secondary bg-black/60 px-4 py-2 hover:bg-secondary hover:text-white transition-all rounded shadow-neon-secondary"
              >
                ← BACK TO ORBIT
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4 items-end">
            <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/40 px-6 py-3 backdrop-blur-md shadow-neon-secondary flex flex-col items-end">
              <span className="text-secondary font-mono tracking-wider text-xs">GLOBAL INFLUENCE</span>
              <span className="text-white font-bold text-2xl">
                {isLoading ? '...' : countries.reduce((sum, c) => sum + c.population, 0).toLocaleString()}
              </span>
            </div>

            <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/40 px-6 py-3 backdrop-blur-md shadow-neon-accent text-accent font-mono tracking-wider flex items-center gap-2">
              CREDITS <span className="text-white font-bold">¤ 13,337</span>
            </div>
          </div>
        </div>

        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-primary font-mono tracking-widest animate-pulse drop-shadow-[0_0_10px_magenta]">
                    ESTABLISHING SATELLITE LINK...
                </div>
            </div>
        )}
      </div>

      {/* 3D RENDERING LAYER */}
      <Canvas className="z-0">
        
        <PerspectiveCamera makeDefault position={[0, 0, 60]} fov={50} />
        
        {/* Helper to animate camera UP vector */}
        <CameraUpdater controlsRef={controlsRef} targetUp={targetUp} />

        {/* Swapped out OrbitControls for CameraControls for programmatic zooming animations! */}
        <CameraControls
          ref={controlsRef}
          minDistance={focusedId ? 2 : EARTH_RADIUS + 2} 
          maxDistance={120} 
          // Prevent the camera from going inside the earth or looking below ground
          maxPolarAngle={focusedId ? Math.PI / 2 - 0.01 : Math.PI}
          dollySpeed={0.5}
          smoothTime={0.4}
        />

        <ambientLight intensity={0.2} />
        <directionalLight position={[100, 200, -100]} intensity={1.5} color="#e2e8f0" />

        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        <CyberOcean radius={EARTH_RADIUS} />

        <WorldMapBorders radius={EARTH_RADIUS} />

        {countries.map((country) => {
           const position = latLngToVector3(country.lat, country.lng, EARTH_RADIUS)

           return (
               <CountryMarker 
                  key={country.id} 
                  country={country} 
                  position={position}
                  onJoin={joinCountry}
                  isAnyFocused={focusedId !== null}
                  isFocused={focusedId === country.id}
                  onFocus={() => handleFocusCountry(country.id, position)}
               />
           )
        })}

        {/* Bloom creates the neon effect automatically across WorldMapBorders AND CountryMarkers */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={1} 
            mipmapBlur
            intensity={1.5}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

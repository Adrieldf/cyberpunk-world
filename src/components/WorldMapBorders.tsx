'use client'

import { useEffect, useState, useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { geoPath, geoTransform } from 'd3-geo'
import { latLngToVector3 } from '@/utils/geo'
import { useSettings } from '@/hooks/useSettings'

interface WorldMapBordersProps {
  radius: number
}

export function WorldMapBorders({ radius }: WorldMapBordersProps) {
  const [geoData, setGeoData] = useState<any>(null)
  const { settings } = useSettings()

  useEffect(() => {
    fetch('/world.geo.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(console.error)
  }, [])

  const linePointsList = useMemo(() => {
    if (!geoData) return []

    // Arrays of [x, y, z] tuples for Drei's Line component
    const allLines: [number, number, number][][] = []

    const processPolygon = (coordinates: [number, number][]) => {
      const lineArray: [number, number, number][] = []
      
      for (const coord of coordinates) {
        // GeoJSON passes [longitude, latitude]
        // We project it directly into spherical Cartesian 3D coordinates based on the Earth's radius!
        lineArray.push(latLngToVector3(coord[1], coord[0], radius))
      }
      
      allLines.push(lineArray)
    }

    geoData.features.forEach((feature: any) => {
      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach((coords: [number, number][]) => {
          processPolygon(coords)
        })
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygonCoords: [number, number][][]) => {
          polygonCoords.forEach((coords: [number, number][]) => {
            processPolygon(coords)
          })
        })
      }
    })

    return allLines
  }, [geoData, radius])

  // Generate a dynamic Canvas texture using D3-geo to paint the landmasses solid!
  const landTexture = useMemo(() => {
    if (!geoData) return null

    const canvas = document.createElement('canvas')
    const width = 4096
    const height = 2048
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return null

    // Use a flat Cartesian projection instead of D3's Spherical projection.
    // This perfectly bypasses topological winding rules inside standard GeoJSON 
    // that were interpreting the ocean as the "inside" of inverted polygons!
    const projection = geoTransform({
      // @ts-ignore
      point: function(x, y) {
        // x = longitude (-180 to 180), y = latitude (90 down to -90)
        // Map longitude to X (0 to width), latitude to Y (0 to height)
        this.stream.point(
          (x + 180) * (width / 360),
          (90 - y) * (height / 180)
        );
      }
    })
    
    // Create a path generator hooked up to our canvas context
    const pathGenerator = geoPath(projection, context)

    // Clear canvas to fully transparent (so the animated ocean shows through the empty space)
    context.clearRect(0, 0, width, height)

    // Fill all polygon landmasses with a dark, solid, matte cyberpunk tone
    context.fillStyle = '#060f18' // Deep void blue-grey
    context.beginPath()
    pathGenerator(geoData)
    context.fill()
    
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [geoData])

  if (!geoData) return null

  return (
    <group>
      {/* SOLID LANDMASS SPHERE */}
      {landTexture && (
        <mesh>
          {/* Radius is 0.999: Higher than the ocean (0.998) but lower than the borders (1.0) */}
          <sphereGeometry args={[radius * 0.999, 64, 64]} />
          <meshBasicMaterial map={landTexture} transparent={true} toneMapped={false} />
        </mesh>
      )}

      {/* GLOWING NEON BORDERS */}
      {linePointsList.map((points, idx) => {
        if (settings.webgpu) {
          const positions = new Float32Array(points.flat())
          return (
            <line key={idx}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={points.length}
                  args={[positions, 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#00ffff" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
            </line>
          )
        }
        
        return (
          <Line 
            key={idx} 
            points={points} 
            color="#00ffff" // Cyberpunk cyan
            lineWidth={1.5}  
            transparent={true}
            opacity={0.3}
            toneMapped={false}
            depthWrite={false}
          />
        )
      })}
    </group>
  )
}

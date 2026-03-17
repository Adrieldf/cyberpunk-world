'use client'

import { Decal, useTexture } from '@react-three/drei'
import * as THREE from 'three'

interface NeonSignProps {
  position: [number, number, number]
  rotation: [number, number, number]
  textureUrl: string
  scale?: [number, number, number]
  color?: string
  intensity?: number
}

export function NeonSign({ 
  position, 
  rotation, 
  textureUrl, 
  scale = [2, 2, 2], // Default scale, you may need to adjust based on the PNG size
  color = '#ffffff', // Allows tinting the base texture
  intensity = 2      // Bloom intensity multiplier
}: NeonSignProps) {
  
  // Load the transparent PNG texture
  const texture = useTexture(textureUrl)
  
  // Optional: Make sure the texture wraps and scales correctly
  texture.anisotropy = 16

  // To prevent z-fighting mathematically without ruining the wrap, 
  // polygonOffset pushes the rendering of the material slightly toward the camera.
  // Alternatively, you can slightly push out the position along the surface normal.
  return (
    <Decal 
      position={position} 
      rotation={rotation} 
      scale={scale}
    >
      <meshBasicMaterial 
        map={texture}
        color={color}
        transparent={true}
        // Multiply color natively to force bloom threshold triggers
        // when using meshBasicMaterial in post-processing!
        colorWrite={true}
        toneMapped={false}
        
        // Z-Fighting prevention techniques
        depthTest={true}
        depthWrite={false}
        polygonOffset={true}
        polygonOffsetFactor={-10} // Forces the GPU to draw it slightly in front of the base mesh
      />
    </Decal>
  )
}

// Pre-load the texture if we know we're going to use it often!
// useTexture.preload('/path-to-your-sign.png')

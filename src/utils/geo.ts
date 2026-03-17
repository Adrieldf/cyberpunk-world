import * as THREE from 'three'

// Convert realistic Latitude and Longitude to 3D Cartesian coordinates on a globe
export function latLngToVector3(lat: number, lng: number, radius: number): [number, number, number] {
  // mathematical conversion mapping angles onto surface normal axes
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return [x, y, z]
}

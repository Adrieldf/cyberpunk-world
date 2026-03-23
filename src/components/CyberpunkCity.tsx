'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function strToSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function createRng(seed: number) {
  let s = (seed >>> 0) || 1
  return (): number => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

// ─── Population → visual level (0‥1, logarithmic checkpoints) ────────────────
const CHECKPOINTS = [0, 1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000]

export function popToLevel(pop: number): number {
  if (pop <= 0) return 0
  const capped = Math.min(pop, 100_000)
  const idx = CHECKPOINTS.findIndex(c => c > capped)
  if (idx === -1) return 1
  if (idx === 0) return 0
  const lo = CHECKPOINTS[idx - 1]
  const hi = CHECKPOINTS[idx]
  const t = (capped - lo) / (hi - lo)
  const loL = (idx - 1) / (CHECKPOINTS.length - 1)
  const hiL = idx / (CHECKPOINTS.length - 1)
  return loL + t * (hiL - loL)
}

// ─── District definitions ─────────────────────────────────────────────────────
type DistrictType = 'brutalist' | 'corporate' | 'hive' | 'kanji' | 'industrial'

const DISTRICTS: Record<DistrictType, { base: string; neon: string; hBias: number; wBias: number; density: number }> = {
  brutalist:  { base: '#100f14', neon: '#ff1a3c', hBias: 1.5,  wBias: 1.8, density: 0.65 },
  corporate:  { base: '#05080f', neon: '#00e5ff', hBias: 2.0,  wBias: 0.5, density: 0.50 },
  hive:       { base: '#120c04', neon: '#ff8800', hBias: 0.65, wBias: 1.3, density: 1.50 },
  kanji:      { base: '#0c0516', neon: '#cc00ff', hBias: 1.1,  wBias: 0.8, density: 0.90 },
  industrial: { base: '#080f08', neon: '#40ff80', hBias: 0.75, wBias: 2.2, density: 0.80 },
}
const DISTRICT_KEYS = Object.keys(DISTRICTS) as DistrictType[]

// ─── City data types ──────────────────────────────────────────────────────────
interface BuildingDatum {
  x: number; z: number
  height: number; width: number; depth: number
  rotation: number
  district: DistrictType
  hasAntenna: boolean
  hasHoloPanel: boolean
  hasDataStream: boolean
  neonBandYPcts: number[]
  rooftopDecor: number   // 0=none, 1=billboard, 2=water tank, 3=dish, 4=machinery, 5=cluster
}

interface CityDatum {
  buildings: BuildingDatum[]
  cityRadius: number
  maxHeight: number
  numDrones: number
}

// ─── City data generator (pure, deterministic) ────────────────────────────────
function generateCityData(population: number, seed: string): CityDatum {
  const level = popToLevel(population)
  const rng   = createRng(strToSeed(seed))

  // ── Two-phase scaling ──────────────────────────────────────────────────────
  // P1 = popToLevel(100) ≈ 6/14 ≈ 0.4286
  const P1 = 6 / 14

  let cityRadius: number
  let maxHeight:  number
  let buildingCount: number

  if (level <= P1) {
    const t   = level / P1
    cityRadius    = 0.04 + t * 0.32    // 0.04 → 0.36  (2× previous)
    maxHeight     = 0.02 + t * 0.55    // 0.02 → 0.57
    buildingCount = Math.max(1, Math.ceil(t * 30))
  } else {
    const t   = (level - P1) / (1 - P1)
    cityRadius    = 0.36 + t * 1.44    // 0.36 → 1.80  (2× previous)
    maxHeight     = 0.57 + t * 0.83    // 0.57 → 1.40
    buildingCount = Math.ceil(40 + t * 310)   // 40 → 350
  }

  const numDrones = Math.floor(level * 9)

  if (population <= 0) return { buildings: [], cityRadius, maxHeight, numDrones }

  // District Voronoi seeds — spread across the full city radius
  const numDistricts = Math.max(1, Math.min(Math.ceil(level * 5), 5))
  const dCenters: { x: number; z: number; type: DistrictType }[] = []
  dCenters.push({ x: 0, z: 0, type: DISTRICT_KEYS[Math.floor(rng() * DISTRICT_KEYS.length)] })
  for (let d = 1; d < numDistricts; d++) {
    const angle = rng() * Math.PI * 2
    // Spread district seeds across full radius so each sector is distinct
    const r = cityRadius * (0.25 + rng() * 0.65)
    dCenters.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r, type: DISTRICT_KEYS[Math.floor(rng() * DISTRICT_KEYS.length)] })
  }

  const buildings: BuildingDatum[] = []

  // Core mega-tower (always dead centre, always tallest)
  buildings.push({
    x: 0, z: 0,
    height: maxHeight,
    width: 0.04 + level * 0.05, depth: 0.04 + level * 0.05,
    rotation: 0,
    rooftopDecor: 0,
    district: dCenters[0].type,
    hasAntenna: true,
    hasHoloPanel: level > 0.25,
    hasDataStream: level > 0.2,
    neonBandYPcts: [0.2, 0.5, 0.8, 0.95].slice(0, Math.ceil(level * 4)),
  })

  // ── Uniform disk placement + Voronoi district assignment ──────────────────
  // sqrt(rng()) × cityRadius gives a uniform distribution density across the
  // full disk area (compensates for the natural bias toward the centre that a
  // plain rng() × cityRadius would produce).
  for (let i = 0; i < buildingCount - 1; i++) {
    const angle  = rng() * Math.PI * 2
    const radial = Math.sqrt(rng()) * cityRadius   // uniform in disk
    const x = Math.cos(angle) * radial
    const z = Math.sin(angle) * radial

    // Nearest district centre (Voronoi) determines the district type
    let nearestDist = Infinity
    let dc = dCenters[0]
    for (const d of dCenters) {
      const dist = Math.sqrt((x - d.x) ** 2 + (z - d.z) ** 2)
      if (dist < nearestDist) { nearestDist = dist; dc = d }
    }
    const cfg = DISTRICTS[dc.type]

    // Height gradient: 0.25 base ensures edge buildings are always at least 25% of max height.
    // Without the base, (1-distNorm)^1.8 → ~0 at the boundary, making buildings flat.
    const distNorm    = Math.min(1, radial / Math.max(cityRadius, 0.001))
    const centralBias = 0.25 + 0.75 * Math.pow(Math.max(0, 1 - distNorm), 1.4)

    const h = Math.max(0.03, maxHeight * 0.12, maxHeight * (0.08 + rng() * 0.92) * cfg.hBias * centralBias)
    // Wider footprints so buildings nearly touch neighbours
    const bw = Math.min((0.06 + rng() * 0.10) * Math.min(cfg.wBias, 1.2), 0.11)
    const bd = Math.min(bw * (0.8 + rng() * 0.5), 0.11)

    const bands: number[] = []
    if (rng() > 0.45) bands.push(0.92)
    if (h > maxHeight * 0.25 && rng() > 0.5) bands.push(0.55)
    if (h > maxHeight * 0.50 && rng() > 0.6) bands.push(0.22)

    // Rooftop decoration type (0=none, weighted toward none)
    const decorRoll = Math.floor(rng() * 9)
    const rooftopDecor = decorRoll < 4 ? 0 : decorRoll - 3  // ~44% none, ~56% decor

    buildings.push({
      x, z, height: h, width: bw, depth: bd,
      rotation: rng() * Math.PI * 2,
      rooftopDecor,
      district: dc.type,
      hasAntenna:    h > maxHeight * 0.75 && rng() > 0.6,   // only very tall buildings
      hasHoloPanel:  level > 0.35 && rng() > 0.65,
      hasDataStream: level > 0.5 && h > maxHeight * 0.4 && rng() > 0.72,
      neonBandYPcts: bands,
    })
  }

  return { buildings, cityRadius, maxHeight, numDrones }
}

// ─── GLSL shaders ─────────────────────────────────────────────────────────────
const VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`

const WINDOW_FRAG = `
uniform float time;
varying vec2 vUv;

float hash21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

void main(){
  vec2 cells = vec2(4.0, 9.0);
  vec2 cell  = floor(vUv * cells);
  float h    = hash21(cell);
  float rate = 0.2 + h * 1.2;
  float on   = step(0.25, 0.5 + 0.5 * sin(time * rate + h * 6.28318));
  // Random off chance (some windows permanently dark)
  on *= step(0.15, h);
  vec3 warm = vec3(1.0, 0.85, 0.45);
  vec3 cold = vec3(0.35, 0.55, 1.0);
  vec3 pink = vec3(1.0, 0.1, 0.7);
  vec3 col  = h < 0.5 ? mix(warm, cold, h * 2.0) : mix(cold, pink, (h - 0.5)*2.0);
  // Window border
  vec2 fc   = fract(vUv * cells);
  float border = step(0.1, fc.x) * step(0.1, fc.y) * step(fc.x, 0.9) * step(fc.y, 0.9);
  gl_FragColor  = vec4(col * 2.5, on * 0.85 * border);
}`

const HOLO_FRAG = `
uniform float time;
uniform vec3  panelColor;
varying vec2  vUv;

void main(){
  float scan  = sin(vUv.y * 40.0 - time * 6.0) * 0.5 + 0.5;
  float band  = step(0.65, sin(vUv.y * 25.0 + time * 2.5));
  float edge  = smoothstep(0.0, 0.08, min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)));
  // flickering hologram alpha 
  float flicker = 0.85 + 0.15 * sin(time * 13.7);
  float alpha = (scan * 0.3 + band * 0.7) * edge * flicker;
  gl_FragColor = vec4(panelColor * 3.5, alpha);
}`

const STREAM_FRAG = `
uniform float time;
uniform vec3  streamColor;
varying vec2  vUv;

void main(){
  float pulse = sin(vUv.y * 18.0 - time * 10.0) * 0.5 + 0.5;
  pulse = pow(pulse, 6.0);
  float horz  = 1.0 - abs(vUv.x - 0.5) * 2.0;
  horz = pow(max(horz, 0.0), 2.0);
  gl_FragColor = vec4(streamColor * 5.0, pulse * horz * 0.9);
}`

const GROUND_FRAG = `
uniform float time;
uniform float radius;
varying vec2 vUv;

void main(){
  vec2 uv   = (vUv - 0.5) * 2.0;
  float r   = length(uv);
  if(r > 1.0) discard;

  // Radial + tangential grid
  float gridR  = abs(fract(r * 8.0) - 0.5);
  float angle  = atan(uv.y, uv.x);
  float gridA  = abs(fract(angle / 0.5236) - 0.5); // every 30 deg
  float lines  = min(gridR, gridA);
  float glow   = smoothstep(0.45, 0.5, 0.5 - lines);

  // Outward pulse
  float pulse  = sin(r * 20.0 - time * 4.0) * 0.5 + 0.5;
  pulse        = pow(pulse, 3.0) * (1.0 - r);

  vec3 col = vec3(0.0, 0.8, 1.0);
  float alpha = (glow * 0.7 + pulse * 0.3) * (1.0 - r * 0.8);
  gl_FragColor = vec4(col, alpha * 0.6);
}`

// ─── CyberpunkCity component ──────────────────────────────────────────────────
interface CyberpunkCityProps {
  population: number
  color: string        // country neon accent color
  seed: string         // country name used as RNG seed
  isFocused: boolean
}

export function CyberpunkCity({ population, color, seed, isFocused }: CyberpunkCityProps) {
  const cityData = useMemo(() => generateCityData(population, seed), [population, seed])

  // ── Shared animated materials ──────────────────────────────────────────────
  const windowMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: VERT, fragmentShader: WINDOW_FRAG,
    transparent: true, side: THREE.FrontSide, depthWrite: false,
  }), [])

  const holoPanelMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, panelColor: { value: new THREE.Color(color) } },
    vertexShader: VERT, fragmentShader: HOLO_FRAG,
    transparent: true, side: THREE.FrontSide, depthWrite: false,
  }), [color])

  const dataStreamMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, streamColor: { value: new THREE.Color(color) } },
    vertexShader: VERT, fragmentShader: STREAM_FRAG,
    transparent: true, side: THREE.FrontSide, depthWrite: false,
  }), [color])

  const groundMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, radius: { value: cityData.cityRadius } },
    vertexShader: VERT, fragmentShader: GROUND_FRAG,
    transparent: true, side: THREE.FrontSide, depthWrite: false,
  }), [cityData.cityRadius])

  // ── Drone instanced mesh ───────────────────────────────────────────────────
  const droneRef  = useRef<THREE.InstancedMesh>(null)
  const droneObj  = useMemo(() => new THREE.Object3D(), [])
  const droneGeom = useMemo(() => new THREE.BoxGeometry(0.013, 0.004, 0.022), [])
  const droneMat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#111', emissive: '#00e5ff', emissiveIntensity: 4, toneMapped: false,
  }), [])
  const { numDrones, cityRadius, maxHeight } = cityData

  // ── Single useFrame for ALL animation ─────────────────────────────────────
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    windowMat.uniforms.time.value    = t
    holoPanelMat.uniforms.time.value = t
    dataStreamMat.uniforms.time.value = t
    groundMat.uniforms.time.value    = t

    if (droneRef.current && numDrones > 0) {
      for (let i = 0; i < numDrones; i++) {
        const speed = 0.8 + (i * 0.17) % 0.9
        const orbitR = cityRadius * (0.45 + (i % 3) * 0.22)
        const h      = maxHeight  * (0.35 + (i % 4) * 0.16) + Math.sin(t * 2.1 + i) * 0.015
        const angle  = t * speed  + (i * Math.PI * 2) / numDrones
        droneObj.position.set(Math.cos(angle) * orbitR, h, Math.sin(angle) * orbitR)
        droneObj.rotation.y = angle + Math.PI / 2
        droneObj.updateMatrix()
        droneRef.current.setMatrixAt(i, droneObj.matrix)
      }
      droneRef.current.instanceMatrix.needsUpdate = true
    }
  })

  if (!isFocused) return null

  const { buildings } = cityData

  return (
    <group>
      {/* Neon ground grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[cityRadius * 1.05, 48]} />
        <primitive object={groundMat} attach="material" />
      </mesh>

      {/* Buildings */}
      {buildings.map((b, i) => {
        const cfg  = DISTRICTS[b.district]
        const halfW = b.width / 2
        const halfD = b.depth  / 2

        return (
          <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rotation, 0]}>

            {/* Body */}
            <mesh position={[0, b.height / 2, 0]} castShadow>
              <boxGeometry args={[b.width, b.height, b.depth]} />
              <meshStandardMaterial color={cfg.base} roughness={0.88} metalness={0.55} />
            </mesh>

            {/* Neon accent bands */}
            {b.neonBandYPcts.map((yp, bi) => (
              <mesh key={bi} position={[0, b.height * yp, 0]}>
                <boxGeometry args={[b.width * 1.12, b.height * 0.022, b.depth * 1.12]} />
                <meshStandardMaterial
                  color="#000" emissive={cfg.neon}
                  emissiveIntensity={3.5} toneMapped={false}
                />
              </mesh>
            ))}

            {/* Window planes – +X face */}
            <mesh position={[halfW + 0.0002, b.height * 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[b.depth, b.height * 0.92]} />
              <primitive object={windowMat} attach="material" />
            </mesh>
            {/* Window planes – -Z face */}
            <mesh position={[0, b.height * 0.5, -halfD - 0.0002]} rotation={[0, 0, 0]}>
              <planeGeometry args={[b.width, b.height * 0.92]} />
              <primitive object={windowMat} attach="material" />
            </mesh>

            {/* Holographic ad panel */}
            {b.hasHoloPanel && (
              <mesh position={[-halfW - 0.0002, b.height * 0.62, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[b.depth * 0.75, b.height * 0.28]} />
                <primitive object={holoPanelMat} attach="material" />
              </mesh>
            )}

            {/* Data stream beam on front face */}
            {b.hasDataStream && (
              <mesh position={[0, b.height * 0.5, halfD + 0.0002]}>
                <planeGeometry args={[b.width * 0.28, b.height * 0.85]} />
                <primitive object={dataStreamMat} attach="material" />
              </mesh>
            )}

            {/* Antenna spike (tallest buildings only) */}
            {b.hasAntenna && (
              <group position={[0, b.height, 0]}>
                <mesh position={[0, 0.025, 0]}>
                  <cylinderGeometry args={[0.0008, 0.002, 0.05, 4]} />
                  <meshStandardMaterial color="#222" emissive={cfg.neon} emissiveIntensity={2} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.052, 0]}>
                  <sphereGeometry args={[0.002, 6, 6]} />
                  <meshStandardMaterial color="#fff" emissive={cfg.neon} emissiveIntensity={6} toneMapped={false} />
                </mesh>
              </group>
            )}

            {/* ── Rooftop decoration ── */}

            {/* 1: Neon billboard */}
            {b.rooftopDecor === 1 && (
              <group position={[0, b.height, 0]}>
                <mesh position={[0, b.height * 0.12, 0]}>
                  <boxGeometry args={[b.width * 0.85, b.height * 0.22, 0.003]} />
                  <primitive object={holoPanelMat} attach="material" />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[b.width * 0.9, 0.005, 0.005]} />
                  <meshStandardMaterial color="#000" emissive={cfg.neon} emissiveIntensity={2} toneMapped={false} />
                </mesh>
              </group>
            )}

            {/* 2: Water tank */}
            {b.rooftopDecor === 2 && (
              <group position={[0, b.height, 0]}>
                <mesh position={[b.width * 0.15, b.width * 0.16, 0]}>
                  <cylinderGeometry args={[b.width * 0.22, b.width * 0.25, b.width * 0.32, 8]} />
                  <meshStandardMaterial color="#2a1a10" roughness={0.95} metalness={0.2} />
                </mesh>
                <mesh position={[b.width * 0.15, b.width * 0.32, 0]}>
                  <cylinderGeometry args={[b.width * 0.23, b.width * 0.23, 0.004, 8]} />
                  <meshStandardMaterial color="#000" emissive={cfg.neon} emissiveIntensity={1.5} toneMapped={false} />
                </mesh>
              </group>
            )}

            {/* 3: Comms dish */}
            {b.rooftopDecor === 3 && (
              <group position={[-b.width * 0.1, b.height, b.depth * 0.1]}>
                <mesh position={[0, b.width * 0.09, 0]}>
                  <cylinderGeometry args={[0.0015, 0.0015, b.width * 0.18, 4]} />
                  <meshStandardMaterial color="#444" />
                </mesh>
                <mesh position={[0, b.width * 0.2, 0]} rotation={[Math.PI * 0.32, 0, 0]}>
                  <circleGeometry args={[b.width * 0.18, 10]} />
                  <meshStandardMaterial color="#0a0a18" emissive={cfg.neon} emissiveIntensity={1.2} toneMapped={false} />
                </mesh>
              </group>
            )}

            {/* 4: Machinery / HVAC cluster */}
            {b.rooftopDecor === 4 && (
              <group position={[0, b.height, 0]}>
                <mesh position={[-b.width * 0.2, b.width * 0.06, 0]}>
                  <boxGeometry args={[b.width * 0.32, b.width * 0.12, b.depth * 0.32]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.9} metalness={0.5} />
                </mesh>
                <mesh position={[b.width * 0.2, b.width * 0.04, b.depth * 0.1]}>
                  <boxGeometry args={[b.width * 0.28, b.width * 0.08, b.depth * 0.22]} />
                  <meshStandardMaterial color="#141414" roughness={0.85} metalness={0.5} />
                </mesh>
                {/* Vent glow strip */}
                <mesh position={[-b.width * 0.2, b.width * 0.125, 0]}>
                  <boxGeometry args={[b.width * 0.33, 0.003, b.depth * 0.33]} />
                  <meshStandardMaterial color="#000" emissive={cfg.neon} emissiveIntensity={1.5} toneMapped={false} />
                </mesh>
              </group>
            )}

            {/* 5: Antenna cluster */}
            {b.rooftopDecor === 5 && (
              <group position={[0, b.height, 0]}>
                {([
                  [-b.width * 0.25, b.height * 0.08, -b.depth * 0.2],
                  [ b.width * 0.20, b.height * 0.06,  b.depth * 0.25],
                  [-b.width * 0.05, b.height * 0.10,  b.depth * 0.10],
                  [ b.width * 0.28, b.height * 0.07, -b.depth * 0.15],
                ] as [number, number, number][]).map(([ax, ah, az], ai) => (
                  <group key={ai} position={[ax, 0, az]}>
                    <mesh position={[0, ah / 2, 0]}>
                      <cylinderGeometry args={[0.001, 0.003, ah, 4]} />
                      <meshStandardMaterial color="#333" emissive={cfg.neon} emissiveIntensity={1.5} toneMapped={false} />
                    </mesh>
                    <mesh position={[0, ah, 0]}>
                      <sphereGeometry args={[0.003, 4, 4]} />
                      <meshStandardMaterial color="#fff" emissive={cfg.neon} emissiveIntensity={5} toneMapped={false} />
                    </mesh>
                  </group>
                ))}
              </group>
            )}
          </group>
        )
      })}

      {/* Drone swarm */}
      {numDrones > 0 && (
        <instancedMesh ref={droneRef} args={[droneGeom, droneMat, numDrones]} />
      )}
    </group>
  )
}

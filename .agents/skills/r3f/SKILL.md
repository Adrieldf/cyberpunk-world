---
name: React Three Fiber & Drei
description: Best practices and guidelines for using Three.js within React, specifically utilizing @react-three/fiber and @react-three/drei in this project.
---

# React Three Fiber (R3F) & Drei Skills

This project utilizes R3F to render 3D cyberpunk scenes.

## Core Principles

1. **Use `useFrame` Carefully**: 
   - Never update React state inside `useFrame`. It will trigger a re-render 60 times a second and kill performance.
   - Use `useRef` to directly mutate object properties (e.g., `ref.current.rotation.y += delta`).
   - Try to use `Math.sin(state.clock.elapsedTime)` for smooth, continuous animations.

2. **Component Structure**:
   - Keep 3D objects as separate React components (like `<Tower />`).
   - Group related meshes using `<group>`.
   - Pass positions and rotations as props, usually utilizing the tuple format (e.g., `position={[x, y, z]}`).

3. **Performance Optimization (Drei)**:
   - Use `<Instances>` and `<Instance>` from `@react-three/drei` when rendering many identical objects (like city blocks or debris).
   - Use `<BakeShadows>` if lighting is static.
   - Use `<Preload>` to ensure assets load properly before rendering.

4. **Lighting & Environment**:
   - Cyberpunk themes require strong contrast. Use low ambient light and strong directional or point lights with distinct colors (neon pink, cyan, red).
   - Use the `<Environment>` component from `drei` to easily setup reflections if PBR materials (Standard/Physical) are used.

5. **Post-Processing**:
   - Use `@react-three/postprocessing` for Bloom to make emissive materials glow (Crucial for the Neon Triad aesthetic).
   - When using bloom, ensure materials that you want to glow have their color set to a high intensity (e.g., `[10, 2, 2]` or use `emissiveIntensity={2}` with `toneMapped={false}`).

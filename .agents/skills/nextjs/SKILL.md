---
name: Next.js 15 App Router
description: Essential guidelines for working with Next.js 15, the App Router, and React Server Components.
---

# Next.js 15 Skills

This project uses Next.js 15 with the App Router (`src/app`).

## Core Principles

1. **Server vs. Client Components**:
   - By default, all components in the App Router are Server Components.
   - R3F (`<Canvas>`, `<mesh>`, etc.) requires client-side APIs (WebGL, standard browser APIs). **Always add `'use client'` at the top of files that contain Three.js or R3F imports**.
   - State (`useState`), effects (`useEffect`), and event listeners (`onClick`) also require `'use client'`.

2. **Routing Structure**:
   - Create new routes by adding folders in `src/app/` with a `page.tsx` file inside.
   - Use `layout.tsx` for persistent UI (like a navigation bar or background canvas).
   - You can put a single, global `<Canvas>` in your root `layout.tsx` or a global wrapper component and use Zustand or context to interact with it across pages, OR use `@react-three/drei`'s `<View>` to render 3D content into 2D DOM elements easily.

3. **Data Fetching**:
   - Fetch data directly in Server Components using `async`/`await`.
   - Next.js 15 introduces changes to caching. Be mindful of `fetch` cache behaviors.

4. **Optimization**:
   - Use Next.js `<Image>` for 2D assets, but remember that Three.js textures will be loaded via `useTexture` (from `drei`) or `TextureLoader`. Place 3D model assets (`.glb`, `.gltf`) and raw textures in the `/public` directory.

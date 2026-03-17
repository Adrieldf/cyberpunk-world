---
name: Tailwind CSS v4 setup and usage
description: Guidelines and specifics on how Tailwind CSS v4 operates in this project.
---

# Tailwind CSS v4 in Neon Triad

This project runs Tailwind CSS v4, which fundamentally changes how configuration is managed compared to v3.

## Core Principles

1. **No `tailwind.config.ts`**:
   - Do not attempt to modify or create a `tailwind.config.ts` file. 
   - All theme configuration goes directly into `src/app/globals.css`.

2. **The `@theme` Directive**:
   - Custom colors, fonts, and spacing are defined as CSS variables inside the `@theme` block in `globals.css`.
   - Example: `--color-primary: #ff00ff;` automatically creates `text-primary`, `bg-primary`, `border-primary`, etc.
   - Use exact variable nesting formats to define categories (e.g., `--color-*`, `--font-*`, `--background-image-*`).

3. **Custom Utilities**:
   - Instead of using the Tailwind plugin API in javascript, create custom utilities using the `@utility` directive in CSS.
   - Example:
     ```css
     @utility text-shadow-neon {
       text-shadow: 0 0 8px currentColor;
     }
     ```

4. **Cyberpunk Aesthetic Values**:
   - Primary: Neon Magenta (`--color-primary`)
   - Secondary: Neon Cyan (`--color-secondary`)
   - Accent: Cyberpunk Red (`--color-accent`)
   - Use `shadow-neon-primary` for outer glow effects on elements like cards or buttons.

5. **Aesthetics over generic layouts**:
   - The UI should always look extremely premium. 
   - Favor glassmorphism, dynamic gradients, and modern dark mode typography.

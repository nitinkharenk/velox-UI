# Preview Sandbox Reference

Read this file when changing:

- generated asset code expectations
- preview compilation behavior
- sandbox iframe rendering
- AI prompts that produce component code for preview

## Why this matters

Generated asset previews do not run inside the main Next.js app bundle. They run inside a custom HTML sandbox built by `lib/preview/sandbox.ts`.

That sandbox currently:

- injects Tailwind from CDN
- loads React UMD and ReactDOM UMD
- loads Framer Motion from CDN and exposes it as `window.Motion`
- loads GSAP from CDN and exposes it as `window.GSAP`
- transpiles component code with Babel Standalone

## Core constraints for generated asset code

- No React import statements
- No Framer Motion import statements
- Use bare hooks from the provided globals
- Use `window.Motion` symbols instead of module imports
- Export as `export default function ComponentName() { ... }`
- Avoid viewport-height assumptions like `min-h-screen`, `h-screen`, `100vh`, or `100dvh`
- Avoid dynamic Tailwind class interpolation such as template-literal class names
- Do not attach interaction listeners to `window` or `document` for mouse/pointer tracking
- Do not use `document.querySelector` or `getElementById` for component logic
- Prefer refs for DOM access
- Keep helper components/functions above the default export
- Do not use deprecated `.onChange()` on motion values

## Practical frontend guidance

- App UI code and generated asset code have different runtime rules
- A pattern that is valid in the main Next.js app may fail in the preview sandbox
- If a task touches both systems, validate assumptions separately for:
  - normal app rendering
  - iframe sandbox rendering

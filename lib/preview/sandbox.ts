const SUPPORTED_RUNTIME_IMPORTS = new Set([
  'react',
  'motion/react',
  'framer-motion',
  'gsap',
  'three',
  'three/examples/jsm/loaders/GLTFLoader',
  'three/examples/jsm/controls/OrbitControls',
])

function normalizeSandboxComponentCode(componentCode: string) {
  const unsupportedImports: string[] = []

  let normalizedCode = componentCode.replace(
    /^\s*import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (_match, source: string) => {
      if (!SUPPORTED_RUNTIME_IMPORTS.has(source) && !unsupportedImports.includes(source)) {
        unsupportedImports.push(source)
      }
      return ''
    },
  )

  normalizedCode = normalizedCode
    .replace(/(^|\n)\s*import\s+['"][^'"]+['"];\s*/g, '$1')
    // Strip window.X destructuring added by toSandboxCode — template pre-declares these globals
    .replace(/^const\s*\{[^}]+\}\s*=\s*window\.(?!THREE)\w+;?\n?/gm, '')
    .replace(/\bexport\s+interface\b/g, 'interface')
    .replace(/\bexport\s+type\b/g, 'type')
    .replace(/\bexport\s+enum\b/g, 'enum')
    .replace(/\bexport\s+const\b/g, 'const')
    .replace(/\bexport\s+function\b/g, 'function')
    .replace(/\bexport\s+class\b/g, 'class')

  const nameMatch = normalizedCode.match(/@name\s+(.+)/)
  const componentName = nameMatch?.[1]?.trim() ?? 'Component'

  let componentExpression = 'Component'

  // Handle window.__component = function Name (output of toSandboxCode)
  const windowComponentMatch = normalizedCode.match(/window\.__component\s*=\s*function\s+(\w+)/)
  if (windowComponentMatch) {
    componentExpression = windowComponentMatch[1]
    normalizedCode = normalizedCode.replace(/window\.__component\s*=\s*function\s+/, 'function ')
  } else {
    const defaultFunctionMatch = normalizedCode.match(/export default function\s+(\w+)/)
    if (defaultFunctionMatch) {
      componentExpression = defaultFunctionMatch[1]
      normalizedCode = normalizedCode.replace(/export default function\s+/, 'function ')
    } else {
      const defaultExpressionMatch = normalizedCode.match(/export default\s+([^;]+);?/)
      if (defaultExpressionMatch) {
        componentExpression = defaultExpressionMatch[1].trim()
        normalizedCode = normalizedCode.replace(/export default\s+([^;]+);?/, '')
      }
    }
  }

  return {
    componentExpression,
    componentName,
    normalizedCode: normalizedCode.trim(),
    unsupportedImports,
  }
}

export function buildSandboxHTML(
  componentCode: string,
  options?: {
    componentProps?: Record<string, unknown> | null
  },
): string {
  const {
    componentExpression,
    componentName,
    normalizedCode,
    unsupportedImports,
  } = normalizeSandboxComponentCode(componentCode)
  const serializedComponentProps = JSON.stringify(options?.componentProps ?? null)

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${componentName}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/framer-motion@11/dist/framer-motion.js"><\/script>
  <script src="https://unpkg.com/gsap@3/dist/gsap.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: #fff; font-family: system-ui, sans-serif;
           min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    #root { width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    #error { color: #f87171; font-family: monospace; font-size: 12px;
             padding: 16px; white-space: pre-wrap; display: none; position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: rgba(0,0,0,0.9); }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error"></div>
  <script>
    console.log('window.Motion:', typeof window.Motion, window.Motion)
    console.log('window.THREE:', typeof window.THREE, window.THREE)
    // --- Globals setup ---
    // framer-motion v11 UMD registers as window.Motion (not window.FramerMotion)
    window.Motion = window.Motion || window.FramerMotion;
    window.GSAP = gsap;

    window.addEventListener("message", (event) => {
      if (event.data === "toggle-theme") {
        document.documentElement.classList.toggle("dark");
        if (document.documentElement.classList.contains("dark")) {
          document.body.style.background = "#0a0a0a";
          document.body.style.color = "#fff";
        } else {
          document.body.style.background = "#f7f7f7";
          document.body.style.color = "#0a0a0a";
        }
      }
    });

    // --- Framer Motion compat layer ---
    // Polyfill .onChange (removed in v11, many AI outputs still use it)
    (function() {
      try {
        var val = window.Motion.motionValue(0);
        var proto = Object.getPrototypeOf(val);
        if (!proto.onChange && proto.on) {
          proto.onChange = function(cb) { return this.on('change', cb); };
        }
        // Polyfill .destroy if missing
        if (!proto.destroy) {
          proto.destroy = function() {};
        }
      } catch(e) {}
    })();

    // --- Error display ---
    function showError(msg) {
      var el = document.getElementById('error');
      el.style.display = 'block';
      el.textContent = (el.textContent ? el.textContent + '\\n\\n' : '') + msg;
    }
    window.onerror = function(msg, src, line, col, err) {
      showError(msg + (err && err.stack ? '\\n' + err.stack : ''));
    };
    window.onunhandledrejection = function(e) {
      showError('Unhandled: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
    };
  <\/script>
  <script>
    // --- React globals (same scope as component code) ---
    const MotionRuntime = window.Motion;
    const { useState, useEffect, useRef, useCallback, useMemo,
            useReducer, useContext, createContext, forwardRef,
            useId, useLayoutEffect, useImperativeHandle,
            Fragment, memo, Suspense, lazy, startTransition } = React;
    const { motion, AnimatePresence, LayoutGroup, MotionConfig,
            Reorder, useAnimate, useAnimation, useCycle,
            useDragControls, useInView, useMotionTemplate,
            useMotionValue, usePresence, useReducedMotion,
            useScroll, useSpring, useTime, useTransform,
            useVelocity, stagger } = MotionRuntime;
    const gsap = window.GSAP;

    try {
      const globalInjection = \`const THREE = window.THREE;\n\`
      const rawCode = globalInjection + \`${normalizedCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/<\/script>/ig, '<\\/script>')}\`;

      ${
        unsupportedImports.length > 0
          ? `showError("Unsupported imports were removed for sandbox preview: ${unsupportedImports.join(', ')}");`
          : ''
      }

      // Compile explicitly with filename to force TSX parsing
      const transformedCode = Babel.transform(rawCode, {
        filename: 'app.tsx',
        presets: [
          ['typescript', { isTSX: true, allExtensions: true }],
          'react'
        ]
      }).code;

      // Evaluate the compiled JS within the current scope (globals available)
      eval(transformedCode);

      const __Component__ = ${componentExpression};
      const __PlaygroundProps__ = ${serializedComponentProps};

      // Error boundary catches render-phase and lifecycle errors
      class __ErrorBoundary__ extends React.Component {
        constructor(props) { super(props); this.state = { error: null }; }
        static getDerivedStateFromError(error) { return { error }; }
        componentDidCatch(error, info) {
          showError(error.message + '\\n' + (error.stack || '') + '\\n' + (info?.componentStack || ''));
        }
        render() {
          if (this.state.error) return React.createElement('div', {
            style: { padding: 16, color: '#f87171', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }
          }, this.state.error.message);
          return this.props.children;
        }
      }

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(
        React.createElement(__ErrorBoundary__, null,
          React.createElement(__Component__, __PlaygroundProps__ ?? undefined)
        )
      );
    } catch(e) {
      showError(e.message + '\\n' + e.stack);
    }
  </script>
</body>
</html>`
}

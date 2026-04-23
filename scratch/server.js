const http = require('http');

const code = `import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useInView, useAnimation, useScroll, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';

// --- Color System Constants ---
const PRIMARY_BACKGROUND = '#0A0A0C';
const ACCENT_BLUE = '#6366F1';
const SECONDARY_ACCENT = '#93C5FD';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';
const HOVER_CARD_BG = '#1A1A1D';

// --- Easing Definitions ---
const smoothSpring = { stiffness: 80, damping: 40 };
const minimalSpring = { stiffness: 200, damping: 25 };
const bouncySpring = { stiffness: 400, damping: 10 };
const elasticSpring = { stiffness: 300, damping: 5 };

// --- Reusable Motion Components ---

interface AnimatedButtonProps {
  children: ReactNode;
  primary?: boolean;
  className?: string;
  onClick?: () => void;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ children, primary = true, className = '', onClick }) => {
  return (
    <motion.button
      whileHover={{
        scale: 1.05,
        boxShadow: \`0 0 25px \${ACCENT_BLUE}66, 0 0 10px \${ACCENT_BLUE}33 inset\`, // 66 is 40% opacity, 33 is 20% opacity
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', ...bouncySpring, duration: 0.15 }}
      className={\`px-6 py-3 rounded-lg font-semibold text-lg whitespace-nowrap \${
        primary
          ? \`bg-[\${ACCENT_BLUE}] text-white\`
          : \`bg-transparent text-white border border-[\${ACCENT_BLUE}]\`
      } \${className}\`}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
};

export default function FuturisticAnimatedTechLandingPage() {
  return <AnimatedButton>Click Me</AnimatedButton>;
}
`;

const SUPPORTED_RUNTIME_IMPORTS = new Set([
  'react',
  'motion/react',
  'framer-motion',
  'gsap',
]);

function normalizeSandboxComponentCode(componentCode) {
  const unsupportedImports = [];

  let normalizedCode = componentCode.replace(
    /^\s*import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"];\s*$/gm,
    (_match, source) => {
      if (!SUPPORTED_RUNTIME_IMPORTS.has(source) && !unsupportedImports.includes(source)) {
        unsupportedImports.push(source);
      }
      return '';
    },
  );

  normalizedCode = normalizedCode
    .replace(/(^|\n)\s*import\s+['"][^'"]+['"];\s*/g, '$1')
    .replace(/^const\s*\{[^}]+\}\s*=\s*window\.\w+;?\n?/gm, '')
    .replace(/\bexport\s+interface\b/g, 'interface')
    .replace(/\bexport\s+type\b/g, 'type')
    .replace(/\bexport\s+enum\b/g, 'enum')
    .replace(/\bexport\s+const\b/g, 'const')
    .replace(/\bexport\s+function\b/g, 'function')
    .replace(/\bexport\s+class\b/g, 'class');

  const nameMatch = normalizedCode.match(/@name\s+(.+)/);
  const componentName = nameMatch?.[1]?.trim() ?? 'Component';

  let componentExpression = 'Component';

  const windowComponentMatch = normalizedCode.match(/window\.__component\s*=\s*function\s+(\w+)/);
  if (windowComponentMatch) {
    componentExpression = windowComponentMatch[1];
    normalizedCode = normalizedCode.replace(/window\.__component\s*=\s*function\s+/, 'function ');
  } else {
    const defaultFunctionMatch = normalizedCode.match(/export default function\s+(\w+)/);
    if (defaultFunctionMatch) {
      componentExpression = defaultFunctionMatch[1];
      normalizedCode = normalizedCode.replace(/export default function\s+/, 'function ');
    } else {
      const defaultExpressionMatch = normalizedCode.match(/export default\s+([^;]+);?/);
      if (defaultExpressionMatch) {
        componentExpression = defaultExpressionMatch[1].trim();
        normalizedCode = normalizedCode.replace(/export default\s+([^;]+);?/, '');
      }
    }
  }

  return {
    componentExpression,
    componentName,
    normalizedCode: normalizedCode.trim(),
    unsupportedImports,
  };
}

function buildSandboxHTML(componentCode) {
  const { componentExpression, componentName, normalizedCode, unsupportedImports } = normalizeSandboxComponentCode(componentCode);

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
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: #fff; font-family: system-ui, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    #root { width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    #error { color: #f87171; font-family: monospace; font-size: 12px; padding: 16px; white-space: pre-wrap; display: none; position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: rgba(0,0,0,0.9); }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error"></div>
  <script>
    window.Motion = FramerMotion;
    window.GSAP = gsap;
    function showError(msg) {
      var el = document.getElementById('error');
      el.style.display = 'block';
      el.textContent = (el.textContent ? el.textContent + '\\n\\n' : '') + msg;
    }
    window.onerror = function(msg, src, line, col, err) { showError(msg + (err && err.stack ? '\\n' + err.stack : '')); };
    window.onunhandledrejection = function(e) { showError('Unhandled: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)); };
  <\/script>
  <script type="text/babel" data-presets="react,typescript">
    const MotionRuntime = window.Motion || FramerMotion;
    const { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, createContext, forwardRef, useId, useLayoutEffect, useImperativeHandle, Fragment, memo, Suspense, lazy, startTransition } = React;
    const { motion, AnimatePresence, LayoutGroup, MotionConfig, Reorder, useAnimate, useAnimation, useCycle, useDragControls, useInView, useMotionTemplate, useMotionValue, usePresence, useReducedMotion, useScroll, useSpring, useTime, useTransform, useVelocity, stagger } = MotionRuntime;
    const gsap = window.GSAP;

    try {
      ${normalizedCode}
      const __Component__ = ${componentExpression};
      const __PlaygroundProps__ = null;
      class __ErrorBoundary__ extends React.Component {
        constructor(props) { super(props); this.state = { error: null }; }
        static getDerivedStateFromError(error) { return { error }; }
        componentDidCatch(error, info) { showError(error.message + '\\n' + (error.stack || '') + '\\n' + (info?.componentStack || '')); }
        render() { if (this.state.error) return React.createElement('div', { style: { padding: 16, color: '#f87171' } }, this.state.error.message); return this.props.children; }
      }
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(__ErrorBoundary__, null, React.createElement(__Component__, __PlaygroundProps__ ?? undefined)));
    } catch(e) { showError(e.message + '\\n' + e.stack); }
  <\/script>
</body>
</html>`;
}

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(buildSandboxHTML(code));
}).listen(3000, () => console.log('Listening on 3000'));

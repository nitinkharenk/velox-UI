const Babel = require('@babel/standalone');

const code = `import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useInView, useAnimation, useScroll, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';

// --- Color System Constants ---
const PRIMARY_BACKGROUND = '#0A0A0C';
const ACCENT_BLUE = '#6366F1';

interface AnimatedButtonProps {
  children: ReactNode;
  primary?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ children, primary = true }) => {
  return <motion.button>{children}</motion.button>;
};

export default function App() {
  return <AnimatedButton>Click</AnimatedButton>;
}
`;

try {
  const out = Babel.transform(code, { filename: 'file.ts', presets: ['typescript', 'react'] });
  console.log("SUCCESS\n" + out.code);
} catch(e) {
  console.error("ERROR", e);
}

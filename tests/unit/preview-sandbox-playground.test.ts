import test from 'node:test'
import assert from 'node:assert/strict'

import { buildSandboxHTML } from '@/lib/preview/sandbox'

const importedComponent = `
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  motion,
  AnimatePresence,
  Transition,
  type VariantLabels,
  type Target,
  type TargetAndTransition
} from 'motion/react';

export interface RotatingTextRef {
  next: () => void;
}

export interface RotatingTextProps {
  texts: string[];
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>(({ texts }, ref) => {
  const [index, setIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    next: () => setIndex((value) => (value + 1) % texts.length),
  }), [texts.length]);

  return (
    <motion.span>
      <AnimatePresence mode="wait">
        <motion.span key={index}>{texts[index]}</motion.span>
      </AnimatePresence>
    </motion.span>
  );
});

RotatingText.displayName = 'RotatingText';
export default RotatingText;
`

test('buildSandboxHTML supports TS components with React and motion/react imports', () => {
  const html = buildSandboxHTML(importedComponent, {
    componentProps: {
      texts: ['One', 'Two', 'Three'],
    },
  })

  assert.match(html, /const __Component__ = RotatingText;/)
  assert.match(html, /const __PlaygroundProps__ = \{"texts":\["One","Two","Three"\]\};/)
  assert.match(html, /React\.createElement\(__Component__, __PlaygroundProps__ \?\? undefined\)/)
  assert.doesNotMatch(html, /import React/)
  assert.doesNotMatch(html, /from 'motion\/react'/)
  assert.doesNotMatch(html, /export interface RotatingTextRef/)
  assert.doesNotMatch(html, /export default RotatingText;/)
})

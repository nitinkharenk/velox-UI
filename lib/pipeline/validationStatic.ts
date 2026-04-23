function mergeStyleProp(tag: string, cssProp: string, cssValue: string): string {
  const styleMatch = tag.match(/style=\{\{([^}]*)\}\}/)

  if (styleMatch) {
    const existing = styleMatch[1].trim()
    if (existing.includes(cssProp)) return tag
    return tag.replace(/style=\{\{[^}]*\}\}/, `style={{ ${existing}, ${cssProp}: ${cssValue} }}`)
  }

  return tag.replace(/>$/, ` style={{ ${cssProp}: ${cssValue} }}>`)
}

export function cleanCodeOutput(raw: string): string {
  return raw
    .replace(/^```(?:tsx?|jsx?|javascript|typescript)?\n?/m, '')
    .replace(/```$/m, '')
    .trim()
}

export function autoFixCode(code: string): string {
  // ─── REMOVED (sandbox-era, now handled by toSandboxCode in transform.ts) ───
  // - import statement stripping
  // - window.React / window.Motion injection
  // - React namespace unwrapping (React.useState → useState) — keep only if
  //   the AI occasionally emits it; it is still valid to clean up.

  // Fix FM v11: .onChange(cb) → .on('change', cb)
  code = code.replace(/\.onChange\s*\(\s*/g, ".on('change', ")

  // Unwrap React namespace references (React.useState → useState)
  // This is safe because production code uses direct named imports.
  code = code.replace(
    /React\.(useState|useEffect|useRef|useCallback|useMemo|useReducer|useContext|createContext|forwardRef|useId|useLayoutEffect|useImperativeHandle|memo|Fragment)/g,
    '$1'
  )

  // Fix viewport height classes → inline style
  code = code.replace(
    /(<[a-zA-Z][^>]*)className="([^"]*)min-h-screen([^"]*)"/g,
    (_, tagStart, before, after) => {
      const cleanClass = `${before}${after}`.replace(/\s+/g, ' ').trim()
      return mergeStyleProp(`${tagStart}className="${cleanClass}"`, 'minHeight', '"360px"')
    }
  )

  code = code.replace(
    /(<[a-zA-Z][^>]*)className="([^"]*)h-screen([^"]*)"/g,
    (_, tagStart, before, after) => {
      const cleanClass = `${before}${after}`.replace(/\s+/g, ' ').trim()
      return mergeStyleProp(`${tagStart}className="${cleanClass}"`, 'height', '"100%"')
    }
  )

  // Fix template-literal classNames → static string
  code = code.replace(/(<[a-zA-Z][^>]*)className=\{`([^`]*)([^>]*)\}/g, (_, tagStart, content, tagEnd) => {
    if (content.includes('${')) {
      const staticParts = content.replace(/\$\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim()
      return `${tagStart}className="${staticParts}"${tagEnd}`
    }
    return `${tagStart}className="${content.trim()}"${tagEnd}`
  })

  // Fix viewport units in style props
  code = code.replace(/(['"'])(100vh|100dvh|100svh)\1/g, '"360px"')

  // Normalize excessive blank lines
  code = code.replace(/\n{3,}/g, '\n\n')

  return code.trim()
}

function stripComments(code: string): string {
  // Remove single line comments
  let sanitized = code.replace(/\/\/.*$/gm, '')
  // Remove multi-line comments
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '')
  return sanitized
}

export function validateCodeString(code: string): { ok: boolean; error?: string } {
  const errors: string[] = []

  // Validate against comment-stripped code to prevent false positives from
  // forbidden strings appearing inside code comments / documentation.
  const activeCode = stripComments(code)
  const isPage = activeCode.includes('scale: "page"') || activeCode.includes('scale: "template"')

  // ── RULE: export default function must be present ──────────────────────────
  if (!activeCode.includes('export default function')) {
    errors.push('Missing: export default function ComponentName()')
  }

  // ── REMOVED RULES (sandbox-era, now invalid for production format) ──────────
  // ✗ "Remove all React imports" — real imports are REQUIRED in production code
  // ✗ "Remove framer-motion imports" — real imports are REQUIRED in production code
  // ✗ "Must destructure from window.React" — window globals are sandbox-only
  // ✗ "Must destructure from window.Motion" — window globals are sandbox-only

  // ── RULE: No viewport units in classNames (breaks in bounded containers) ───
  if (!isPage && /\bmin-h-screen\b|\bh-screen\b|\b100vh\b|\b100dvh\b/.test(activeCode)) {
    errors.push('Remove viewport units (min-h-screen, h-screen, 100vh). Use style={{ minHeight: "360px" }} instead.')
  }

  // ── RULE: No arbitrary Tailwind brackets ───────────────────────────────────
  if (/\b(?:min-h|h|w|max-w|max-h)-\[\d+[a-z]*\]/.test(activeCode)) {
    errors.push('Arbitrary Tailwind bracket values like h-[400px] or w-[800px] are unreliable in CDN mode. Use inline style={{ height: "400px" }} instead.')
  }

  // ── RULE: No template-literal classNames ──────────────────────────────────
  if (/className=\{[^}]*\$\{/.test(activeCode)) {
    errors.push('Template-literal classNames with ${} will not work — no Tailwind build step. Use inline style={{}} for dynamic values.')
  }

  // ── RULE: No global event listeners ───────────────────────────────────────
  if (/window\.addEventListener\s*\(/.test(activeCode)) {
    errors.push('Remove window.addEventListener — use element-level React event props (onMouseMove, onClick) or attach via useEffect + ref instead.')
  }
  if (/document\.addEventListener\s*\(\s*['\"`](mouse|pointer|click|touch|scroll)/.test(activeCode)) {
    errors.push('Remove document.addEventListener for mouse/pointer/scroll events — use element-level listeners instead.')
  }

  // ── RULE: No DOM queries ───────────────────────────────────────────────────
  if (/\b(?:document|window)\.querySelector\s*\(/.test(activeCode) || /\b(?:document|window)\.getElementById\s*\(/.test(activeCode)) {
    errors.push('Do NOT use document.querySelector or getElementById for component logic. Use React hook useRef to reference DOM elements safely.')
  }

  // ── RULE: No .get() on MotionValues inside style prop ────────────────────
  if (/style=\{\{[^}]*\.get\(\)[^}]*\}\}/.test(activeCode)) {
    errors.push('Do NOT call `.get()` on MotionValues inside the render `style` prop. Pass the MotionValue directly to the `motion` component style prop instead.')
  }

  // ── RULE: No duplicate style / className props on same element ───────────
  if (/<[a-zA-Z0-9.-]+(?:(?!\bstyle=|>)[\s\S])*?\bstyle=(?:(?!\bstyle=|>)[\s\S])*?\bstyle=/i.test(activeCode)) {
    errors.push('Duplicate `style` props detected on the same JSX element. Combine all styles into a single `style={{}}` object.')
  }
  if (/<[a-zA-Z0-9.-]+(?:(?!\bclassName=|>)[\s\S])*?\bclassName=(?:(?!\bclassName=|>)[\s\S])*?\bclassName=/i.test(activeCode)) {
    errors.push('Duplicate `className` props detected on the same JSX element. Combine all classes into a single string.')
  }

  // ── RULE: No hardcoded fake image paths ──────────────────────────────────
  if (/src=["'](?:profile|image|avatar|test|demo|placeholder)[^"']*.[a-z]{3,4}["']/i.test(activeCode)) {
    errors.push('Do NOT use hardcoded fake image paths like `src="profile.jpg"`. Use unstyled generic placeholder `div`s, or guaranteed external placeholder APIs if an image is absolutely required.')
  }

  // ── RULE: No placeholder icon class names ────────────────────────────────
  if (/\bclassName=["'][^"']*icon\d*[^"']*["']/.test(activeCode)) {
    errors.push('Do NOT use placeholder classes like `className="icon1"` for icons. The environment does not have FontAwesome or icon libraries pre-loaded. Use inline SVG elements for all icons.')
  }

  // ── RULE: No non-Tailwind custom semantic class names ────────────────────
  const nonTailwindPattern = /className=["']([^"']+)["']/g
  let cnMatch: RegExpExecArray | null
  while ((cnMatch = nonTailwindPattern.exec(activeCode)) !== null) {
    const tokens = cnMatch[1].split(/\s+/)
    for (const token of tokens) {
      let base = token.replace(/^[a-z-]+:/, '')
      if (base.startsWith('-')) {
        base = base.slice(1)
      }
      const parts = base.split('-')
      const knownPrefixes = new Set([
        'bg','text','border','ring','shadow','rounded','flex','grid','gap','p','px','py','pt','pb','pl','pr',
        'm','mx','my','mt','mb','ml','mr','w','h','min','max','leading','tracking','font','uppercase','lowercase',
        'capitalize','truncate','overflow','hidden','block','inline','absolute','relative','fixed','sticky',
        'top','bottom','left','right','inset','z','opacity','transition','duration','ease','delay','transform',
        'scale','rotate','translate','skew','origin','cursor','pointer','select','outline','resize','object',
        'items','justify','content','self','place','col','row','space','divide','animate','sr','not','group',
        'peer','before','after','first','last','odd','even','focus','hover','active','disabled','checked',
        'placeholder','aspect','columns','break','order','underline','line','decoration','whitespace','vertical',
        'list','table','float','clear','visible','invisible','collapse','static','mix','blur','brightness',
        'contrast','drop','grayscale','hue','invert','saturate','sepia','backdrop','fill','stroke','accent',
        'caret','scroll','snap','touch','will','isolation','appearance','display',
        'from','to','via',
      ])
      if (parts.length >= 3 && !knownPrefixes.has(parts[0])) {
        errors.push(`Non-Tailwind className token "${token}" detected. Custom semantic names (like "decorative-layer-1") do nothing in CDN Tailwind. Use only valid Tailwind utilities in className.`)
        break
      }
    }
  }

  // ── RULE: isHovered ternary must differ on both branches ─────────────────
  const isHoveredTernaryPattern = /isHovered\s*\?\s*(['\"`][^'\"`]+['\"`])\s*:\s*(['\"`][^'\"`]+['\"`])/g
  let htMatch: RegExpExecArray | null
  while ((htMatch = isHoveredTernaryPattern.exec(activeCode)) !== null) {
    if (htMatch[1] === htMatch[2]) {
      errors.push(`isHovered ternary has identical values on both branches: ${htMatch[0]} — the conditional has no effect. Use different values for hovered vs. resting state.`)
    }
  }

  // ── RULE: FM v11 — .onChange() is removed ────────────────────────────────
  if (/\.onChange\s*\(/.test(activeCode)) {
    errors.push('.onChange() was removed in framer-motion v11. Use .on(\'change\', callback) instead.')
  }

  // ── RULE: No React state passed into useTransform/useSpring ──────────────
  const stateVars = [...activeCode.matchAll(/const\s+\[([a-zA-Z0-9_]+)\s*,/g)].map(m => m[1])
  for (const sv of stateVars) {
    const regex = new RegExp(`(?:useTransform|useSpring)\\(\\s*${sv}\\s*[,\\)]`)
    if (regex.test(activeCode)) {
      errors.push(`Do NOT pass standard React state '${sv}' into useTransform or useSpring. These hooks REQUIRE a MotionValue. Use 'const ${sv} = useMotionValue(0)' instead.`)
    }
  }

  // ── RULE: No helper components declared after export default ─────────────
  const exportDefaultIdx = activeCode.indexOf('export default function')
  if (exportDefaultIdx !== -1) {
    const matches = activeCode.matchAll(/\n(?:function|const)\s+([A-Z][a-zA-Z]+)/g)
    for (const m of matches) {
      if (m.index && m.index > exportDefaultIdx) {
        errors.push(`Helper component "${m[1]}" is declared after export default. Move ALL helpers BEFORE the export default function.`)
      }
    }
  }

  // ── RULE: Code must not be truncated ─────────────────────────────────────
  const trimmed = activeCode.trimEnd()
  if (!trimmed.endsWith('}')) {
    errors.push('Code is truncated — does not end with closing brace. Output the COMPLETE component.')
  }
  const opens = (activeCode.match(/\{/g) || []).length
  const closes = (activeCode.match(/\}/g) || []).length
  if (Math.abs(opens - closes) > 2) {
    errors.push(`Unbalanced braces: ${opens} open vs ${closes} close. Code is likely truncated.`)
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('\n- ') }
  }

  return { ok: true }
}

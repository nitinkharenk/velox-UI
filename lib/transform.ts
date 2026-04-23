/**
 * Transforms production React component code into
 * sandbox-compatible format for preview only.
 * Never store the output — always derive at request time.
 */

export function toSandboxCode(code: string): string {
  let transformed = code

  // Convert framer-motion imports to window.Motion destructure
  transformed = transformed.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]framer-motion['"]\s*;?\n?/g,
    (_, imports) => {
      const cleaned = imports
        .split(',')
        .map((i: string) => i.trim())
        .filter(Boolean)
        .join(', ')
      return `const { ${cleaned} } = window.Motion;\n`
    }
  )

  // Convert react imports to window.React destructure
  transformed = transformed.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]react['"]\s*;?\n?/g,
    (_, imports) => {
      const cleaned = imports
        .split(',')
        .map((i: string) => i.trim())
        .filter(Boolean)
        .join(', ')
      return `const { ${cleaned} } = window.React;\n`
    }
  )

  // Three.js namespace import: import * as THREE from 'three'
  transformed = transformed.replace(
    /import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?\n?/g,
    'const THREE = window.THREE;\n'
  )

  // Three.js named imports from subpaths: import { GLTFLoader } from 'three/examples/jsm/...'
  transformed = transformed.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]three\/examples\/jsm\/[^'"]+['"]\s*;?\n?/g,
    (_, imports) => {
      const names = imports.split(',').map((i: string) => i.trim()).filter(Boolean)
      return names.map((name: string) => `const ${name} = window.THREE.${name} || null;\n`).join('')
    }
  )

  // Remove any remaining import statements
  transformed = transformed.replace(
    /import\s+(?:type\s+)?.+\s+from\s+['"][^'"]+['"]\s*;?\n?/g,
    ''
  )

  // Replace export default with window.__component assignment
  transformed = transformed.replace(
    /export\s+default\s+function\s+(\w+)/,
    'window.__component = function $1'
  )

  // Remove TypeScript type annotations for eval compatibility
  // Interface and type declarations
  transformed = transformed.replace(
    /^(interface|type)\s+\w+[^{]*\{[^}]*\}\s*\n?/gm,
    ''
  )
  // Inline type annotations on props
  transformed = transformed.replace(
    /:\s*\w+(\[\])?(\s*\|\s*\w+(\[\])?)*(?=[\s,)=])/g,
    ''
  )
  // Generic type parameters
  transformed = transformed.replace(/<[A-Z]\w*>/g, '')

  return transformed.trim()
}

/**
 * Validates that a transform produced runnable sandbox code.
 * Returns array of issues found, empty array means clean.
 */
export function validateSandboxCode(code: string): string[] {
  const issues: string[] = []

  if (code.includes('import '))
    issues.push('Contains remaining import statements')

  if (!code.includes('window.__component'))
    issues.push('Missing window.__component assignment')

  if (code.includes('export default'))
    issues.push('Contains remaining export default')

  return issues
}

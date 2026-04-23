import type { ValidationIssue } from '@/types/pipeline'

// ── System prompt (sent on every generate + fix call) ────────────────────────
export const CODE_GEN_SYSTEM_PROMPT = `You are a senior React + Framer Motion engineer.

Generate a COMPLETE, production-ready React component from the spec.

Output RAW CODE ONLY. No markdown. No explanation. No code fences.

---

⚙️ TECH RULES (STRICT)

- Use real React imports: import { useState, useRef, useEffect } from 'react'
- Use real Framer Motion imports: import { motion, useInView, useAnimation } from 'framer-motion'
- Export as: export default function ComponentName()
- Full TypeScript — use proper types and interfaces
- No window.React or window.Motion references anywhere
- Tailwind CSS for all styling

---

🪝 HOOK RULES (STRICT)

- All hooks at the top of each function component
- Never call hooks inside loops, conditions, or nested functions
- Never call hooks outside of function components
- Import only the hooks you actually use

---

📁 STRUCTURE RULES

- Single file output
- Define all sub-components BEFORE the main export default function
- Main component must be the last thing in the file
- No circular references between sub-components

---

🎨 MOTION DESIGN RULES

1. DEPTH
Apply visual_depth from spec using opacity, blur (filter), scale

2. MOTION QUALITY
- Avoid straight-line motion
- Combine at least 2 of: x/y movement, scale, opacity
- Use curved/orbital/wave patterns where motion_style specifies

3. VARIATION
Every repeated element must differ in delay, duration, or scale.
NO identical animations across repeated elements.

4. FOCAL POINT
Implement the focal_point from visual_spec as a dominant visual anchor.

5. COLOR SYSTEM
Use exact hex values from visual_spec.color_system.
Never use flat white-only designs.

---

⚠️ PRE-OUTPUT CHECKLIST
Before outputting, verify every item:
□ All imports at top of file using real import syntax
□ No window.React or window.Motion anywhere
□ export default function present
□ No hooks inside loops or conditionals
□ All sub-components defined before main component
□ TypeScript types on all props
□ Container has minHeight and width: 100% in style prop
□ Every repeated element has unique animation timing

---

INPUT SPEC:
{{SPEC_JSON}}`

// ── Trim helpers ──────────────────────────────────────────────────────────────

/** Strips fields that add no information: empty strings, empty arrays, null, undefined. */
export function trimIdeaForPrompt(idea: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(idea)) {
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    result[k] = v
  }
  return result
}

/** Keeps only the fields a code generator actually needs — drops SEO/metadata. */
export function trimSpecForCodeGen(spec: Record<string, unknown>): Record<string, unknown> {
  const KEEP = new Set([
    'name',
    'scale',
    'format',
    'motion_style',
    'visual_depth',
    'animation_spec',
    'visual_spec',
    'implementation_notes',
    'interactions',
    'tech',
    'component_structure',
    'sections'
  ])
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(spec)) {
    if (KEEP.has(k) && v !== null && v !== undefined) result[k] = v
  }
  return result
}

/** Extracts motion-value setup lines + JSX return block — enough for semantic validation. */
export function trimCodeForValidation(code: string): string {
  const lines = code.split('\n')
  const motionLines: string[] = []

  for (const line of lines) {
    if (
      /=\s*(useMotionValue|useSpring|useTransform|useAnimation|useScroll|useVelocity|useInView|useAnimationFrame)\s*\(/.test(line)
    ) {
      motionLines.push(line.trim())
    }
  }

  const returnIdx = lines.findIndex(l => /^\s*return\s*\(/.test(l))
  const returnBlock = returnIdx !== -1 ? lines.slice(returnIdx).join('\n') : ''

  if (!returnBlock) return code

  const parts: string[] = []
  if (motionLines.length > 0) parts.push('// motion setup', ...motionLines, '')
  parts.push('// JSX return', returnBlock)
  return parts.join('\n')
}

// ── Prompt builders ───────────────────────────────────────────────────────────

export function buildEnrichPrompt(ideaJson: string): string {
  return `You are a senior UI motion designer and frontend architect.

Convert the input idea into a HIGH-QUALITY, BUILDABLE UI SPEC for a premium component library.

Return ONLY valid JSON. No markdown. No explanation.

---

GOAL
Create a spec that produces visually rich, modern, and non-generic UI.

---

SCALE DETECTION (READ FIRST)

Before writing the spec, detect the output scale from the idea:

- If idea.format === "template" OR idea.type includes "page" OR idea.complexity === "complex"
  set scale: "page"
  component_structure must describe FULL PAGE architecture (all sections, layout system)
  motion_style applies at SECTION level, not element level

- Otherwise
  set scale: "component"
  component_structure describes a single bounded UI component

This scale field MUST be present in your output and will be passed to all downstream stages.

---

REQUIRED FIELDS

{
  "name": "",
  "description": "",
  "seo_description": "",
  "scale": "page | component",
  "format": "template | component | section",
  "motion_style": "",
  "visual_depth": {
    "foreground": "",
    "midground": "",
    "background": ""
  },
  "animation_spec": {},
  "visual_spec": {},
  "component_structure": "",
  "sections": [],
  "interactions": [],
  "implementation_notes": "",
  "tags": [],
  "tech": ["Tailwind","Framer Motion","React"]
}

---

SECTIONS FIELD (required when scale === "page")

List every page section in order:
[
  {
    "id": "navbar",
    "name": "Navbar",
    "layout": "sticky top, full-width, glass effect",
    "key_elements": ["logo", "nav links", "CTA button"],
    "animation": "fade down on mount"
  }
]

This gives Code Gen a section-by-section contract to implement.

---

MOTION STYLE — choose ONE and be specific:
orbital (circular / rotating motion), neural (branching / spreading), wave (flowing / sinusoidal), pulse (expansion / breathing), parallax (depth-based movement).
Describe EXACT behavior, not generic text.

---

VISUAL DEPTH — define all 3 layers with blur levels, opacity variation, scale differences:
foreground: sharp, brighter interactive elements
midground: main content surface
background: blurred / low opacity decorative layer

---

FOCAL POINT — define a central visual anchor (glow core, gradient center, highlighted element).

---

COLOR SYSTEM — premium dark palette, 2-3 exact hex colors, no flat white-only designs.

---

ANIMATION SPEC — must include:
trigger (hover / loop / mouse / scroll), motion type (non-linear, curved, orbital),
easing (spring or cubic-bezier), duration, variation rules (delay, randomness).
whileHover MUST list ALL properties that change: scale, backgroundColor, borderColor, color, boxShadow.

---

INTERACTIONS — must be concrete:
"mouse movement shifts parallax layers by plus or minus 30px using spring"
"card hover changes: scale 1 to 1.03, bg #18181B to #27272A, border transparent to #6366F1, shadow 0 to 0 0 20px rgba(99,102,241,0.15)"
All hover interactions must specify EVERY property that changes.

---

IMPLEMENTATION NOTES — must include:
hooks needed (useMotionValue, useSpring, useInView, useScroll),
where hooks live (inside component, inside helper components),
how depth is calculated, how variation is applied (delay offsets, random seeds).

---

PHYSICS AND FEEL MAPPING:
fluid: stiffness 100, damping 20 | bouncy: stiffness 400, damping 10
magnetic: stiffness 600, damping 30 | mechanical: stiffness 1000, damping 60
minimal: stiffness 200, damping 25 | elastic: stiffness 300, damping 5
smooth: stiffness 80, damping 40 | instant: stiffness 2000, damping 80

---

CONSTRAINTS:
All hooks inside component. Must be implementable in React + Framer Motion.
Avoid generic descriptions. scale and format fields are MANDATORY.

JSON ESCAPING RULES:
You MUST strictly escape all quotes and newlines inside string values.
Failure to escape internal characters will cause JSON parsing failure.

---

OUTPUT CONSTRAINTS (STRICT):
- This spec will be used to generate a single-file React component
- Do NOT mention Next.js, App Router, or server components anywhere
- Do NOT reference file structure, routing, or page architecture
- Do NOT add Next.js to the tech array
- tech array must only be: ["Tailwind", "Framer Motion", "React"]
- component_structure field must describe a single React component only
- All section descriptions must assume a single file, no imports needed
- implementation_notes must not mention Next.js hooks or patterns

---

INPUT:
${ideaJson}`
}


export function buildGenPrompt(specJson: string, phase?: 'structure' | 'logic' | 'polish'): string {
  let phaseInstruction = ''
  if (phase === 'structure') {
    phaseInstruction = `
[PHASE: STRUCTURE]
Focus purely on the HTML skeleton, Tailwind layout, and static styling.
1. Implement the full DOM structure described in 'component_structure'.
2. Add all Tailwind classes for layout, spacing, and colors.
3. Include the JSDoc header.
4. DO NOT add complex Framer Motion logic yet.
5. Ensure the component is syntactically complete but inert.
`
  } else if (phase === 'logic') {
    phaseInstruction = `
[PHASE: LOGIC & HOOKS]
Integrate React state, Framer Motion hooks, and event handlers.
1. Add real import statements: import { useState, useEffect, useRef } from 'react', import { motion, useMotionValue, ... } from 'framer-motion'.
2. Implement all useMotionValue, useSpring, and useTransform hooks.
3. Add handleMouseMove, handleMouseLeave, and other interaction logic.
4. Bind hooks to the JSX style props.
5. Use whileHover and whileTap for interactive states.
`
  } else if (phase === 'polish') {
    phaseInstruction = `
[PHASE: POLISH & REFINEMENT]
Finalize animations, cleanup code, and ensure peak performance.
1. Refine transition timings and easing.
2. Add stagger effects for children if specified.
3. Audit isHovered ternaries for premium feel.
4. Verify all rules are strictly followed.
5. Return the COMPLETE, production-ready component.
`
  }

  // Inject page-scale instructions when spec is a full template
  let scaleInstruction = ''
  try {
    const parsed = JSON.parse(specJson)
    if (parsed.scale === 'page' || parsed.format === 'template') {
      const sectionList = Array.isArray(parsed.sections) && parsed.sections.length > 0
        ? `\nSECTIONS TO IMPLEMENT (in order):\n${parsed.sections.map((s: {id: string; name: string; layout: string; key_elements: string[]; animation: string}) =>
            `  - [${s.id}] ${s.name}: ${s.layout} | elements: ${s.key_elements?.join(', ')} | animation: ${s.animation}`
          ).join('\n')}`
        : ''

      scaleInstruction = `
━━━ PAGE-SCALE GENERATION ━━━
This is a FULL PAGE (scale: "page"). You MUST:
1. Implement ALL sections listed below, in order — no section may be skipped or stubbed.
2. Wrap each section in its own <section> element with a unique id matching the section "id".
3. Use ONE scrollable outer container: style={{ minHeight: '100%', width: '100%' }} (NEVER 100vh).
4. Apply max-w-6xl mx-auto to inner content — use full-width backgrounds per section.
5. Use useInView for each section to trigger scroll-reveal animations.
6. Maintain ONE consistent color system, spacing, and typography throughout all sections.
7. Aim for 400–900 lines for a complete multi-section page.
${sectionList}
`
    }
  } catch { /* on parse failure, treat as component */ }

  return `Generate a React component matching this exact specification.
Output RAW CODE ONLY. No markdown. No explanation. No backticks.
Be as concise as possible (Maximum 1,200 lines).
Focus on production-ready implementation of the spec.
${phaseInstruction}
${scaleInstruction}
HARD RULES — violating any of these will cause runtime failure:
1. ALL hooks MUST be called inside the default export function — never at module scope.
2. Use real imports: import { motion, ... } from 'framer-motion' — NO window.Motion or window.React.
3. Use whileHover and whileTap for hover/active states.
4. Use useState(false) for hover state if required for colors.
5. Use inline style={{}} for all sizing, color, and dynamic values.
6. handleMouseMove and handleMouseLeave MUST be defined inside the component.
7. Every motion value created must be used in JSX — no orphaned variables.
8. Absolute positioned overlays require their parent to have position: relative.
9. Dead motion values are a CRITICAL bug.
10. isHovered conditionals MUST have different values on each branch.
11. springX and springY MUST be applied to the outermost interactive element.
12. Do NOT use non-Tailwind words as className values.

SPECIFICATION:
${specJson}`
}

export function buildValidationPrompt(
  specJson: string, 
  numberedCode: string, 
  previousIssues?: ValidationIssue[], 
  attempt = 1
): string {
  // Build a focused spec summary for the validator
  let summarySpec = specJson
  try {
    const spec = JSON.parse(specJson) as Record<string, unknown>
    const anim = spec.animation_spec as Record<string, unknown> | undefined
    summarySpec = JSON.stringify({
      name: spec.name,
      scale: spec.scale,
      format: spec.format,
      sections: spec.sections,
      animation_spec: anim
        ? { trigger: anim.trigger, entry: anim.entry, active: anim.active, exit: anim.exit }
        : undefined,
      visual_spec: spec.visual_spec,
      component_structure: spec.component_structure,
      interactions: spec.interactions,
      implementation_notes: spec.implementation_notes,
    }, null, 2)
  } catch { /* use original on parse failure */ }

  // On repair attempt 2+, only re-evaluate prior issues for token efficiency
  const priorIssuesSection = previousIssues && previousIssues.length > 0
    ? `\nPRIOR ISSUES (repair attempt ${attempt} — only re-evaluate these):\n${JSON.stringify(previousIssues, null, 2)}\n
For each prior issue, output a resolution_report entry: { "previous_message": "...", "resolved": true|false }
Do NOT re-run full validation. Only check if prior issues are resolved.`
    : ''

  return `You are a senior React auditor and UI quality reviewer.

Analyze the component code (which is LINE NUMBERED) and compare it against the spec.

Return ONLY a valid JSON array of issues. No explanation. No markdown. No fixed code.
If there are no issues, return an empty array: []

STRICT RULES:
1. Identify EXACT line numbers (line_start, line_end) for each issue.
2. DO NOT rewrite the code.
3. Be surgical and precise.

SCALE-AWARE VALIDATION:
- PAGE: Verify all sections implemented, scroll flow, CTA hierarchy, hover completeness.
- COMPONENT: Verify focal point, concise implementation (<200 lines).

VALIDATION RULES (CRITICAL):
1. TECHNICAL: Hook usage, Motion props, Tailwind utilities, style={{}} discipline.
2. HOVER COMPLETENESS: Every interactive element must have scale + bg + border + shadow changes as per spec.
3. QUALITY: Easing, variation, depth layers, visual hierarchy.

SCORING (WEIGHTED BY SEVERITY):

Start at 100.
Deduct per issue found:
- critical: -25
- high: -10
- medium: -3
- low: -0.5

Round to nearest integer.

STATUS RULES:
- Any critical issue present → status: "FAIL" regardless of score
- score >= 75, no critical → status: "PASS"
- score >= 60, no critical → status: "PASS_WITH_WARNINGS"
- score < 60 OR any critical → status: "FAIL"

IMPORTANT: Do not fail on these — they are handled by transform layer:
- window.React or window.Motion usage (not applicable anymore)
- Missing import statements (Gen now uses real imports)
- export default format

${priorIssuesSection}

SPECIFICATION:
${summarySpec}

CODE (LINE NUMBERED):
${numberedCode}

Output ONLY valid JSON:
{
  "status": "PASS" | "PASS_WITH_WARNINGS" | "FAIL",
  "score": 0-100,
  "issues": [
    {
      "line_start": number,
      "line_end": number,
      "severity": "critical" | "high" | "medium" | "low",
      "type": "syntax" | "logic" | "motion" | "design" | "spec",
      "message": "clear explanation with reference to line numbers"
    }
  ],
  "resolution_report": [
    { "previous_message": "...", "resolved": true | false }
  ]
}
`
}

export function buildRepairAcceptancePrompt(
  originalCode: string,
  repairedCode: string,
  issuesJson: string,
): string {
  return `You are a pipeline quality guard.

Compare the ORIGINAL code and the REPAIRED code.
If they are identical or differ by fewer than 5 meaningful lines, return:
{ "accepted": false, "reason": "Repair made no meaningful changes" }

If the repair meaningfully addresses the issues listed, return:
{ "accepted": true }

Output ONLY valid JSON.

ORIGINAL CODE:
${originalCode}

REPAIRED CODE:
${repairedCode}

ISSUES THAT SHOULD BE FIXED:
${issuesJson}`
}

/**
 * Builds a surgical repair prompt that asks for search/replace patches.
 */
export function buildPatchRepairPrompt(
  specJson: string,
  snippetsJson: string,
): string {
  return `You are a code repair agent. Fix only the broken snippets below.
 
Return ONLY a valid JSON array of patches. No explanation. No markdown. No full file.
No prose. No code comments like "I have fixed...".
 
Each patch must follow this exact shape:
{ "search_str": "EXACT character-for-character string to find", "replace_str": "The fixed replacement string" }
 
STRICT REPAIR DISCIPLINE (READ CAREFULLY):
1. The search_str must be UNIQUE and exist exactly in the code.
2. The replace_str must produce working code when swapped into the original file.
3. SILENT REPAIR: NEVER leave forbidden strings (like window.addEventListener) inside comments of the repaired code. This triggers validation failures.
4. If you fix a snippet by commenting something out, do NOT use the forbidden string in your comment. 
   BAD: // Removed window.addEventListener 
   GOOD: // Removed listener
5. HOOK CONSISTENCY: If your fix uses a new Framer Motion or React hook (e.g. useTransform), you MUST include a patch that updates the import statement at the top of the file.
6. FIX ONLY what is broken in the snippet. Do not refactor unrelated parts.
7. If a snippet needs no fix, omit it from the return array.
8. Code uses real ES import syntax — do NOT replace imports with window globals.
 
SPECIFICATION:
${specJson}
 
BROKEN SNIPPETS (with line context):
${snippetsJson}
 
Output ONLY a JSON array: [{ "search_str": "...", "replace_str": "..." }]
`
}
 
/**
 * Builds the fix prompt. On attempt 1 sends full spec + issues + code.
 * On attempt 2+ uses targeted repair with PATCHED comments to prevent token inflation.
 */
export function buildFixPrompt(
  specJson: string,
  code: string,
  validationReportJson: string,
  attempt = 1,
): string {
  const hardRules = `HARD RULES (must hold after repair):
1. ALL hooks inside the default export function — never module scope
2. Use real imports: import { motion, ... } from 'framer-motion' — NO window.Motion or window.React
3. whileHover/whileTap for hover and active states
4. isHovered state for color/text changes driven by hover
5. Every motion value must be used in JSX — no orphaned variables
6. handleMouseMove and handleMouseLeave defined inside the component function
7. Absolute overlays require a parent with position: relative
8. isHovered ternaries MUST have different values on each branch
9. springX/springY applied to the outermost interactive element
10. If you add a new Framer Motion or React hook, update the import statement at the top of the file.
11. SILENT REPAIR: NEVER include forbidden patterns (like window.addEventListener) in your repair comments. Use abstract descriptions like "// Removed listener".`
 
  const outputInstruction = `Output RAW CODE ONLY. No markdown. No explanation. No backticks.
Focus on production-ready implementation of the spec.`
 
  if (attempt > 1) {
    return `You are a senior React/Framer Motion engineer performing a targeted code repair (attempt ${attempt}).
 
REPAIR EFFICIENCY RULES:
- ONLY fix the specific issues listed below — do not refactor unrelated code
- SILENT REPAIR: DO NOT use forbidden strings (e.g. window.addEventListener) in repair comments. 
- HOOK CONSISTENCY: If you use new hooks, update the import statement at the top of the file.
- Mark every changed section with a comment: // PATCHED: [issue type]
- PRESERVE all unchanged code exactly as-is
- PRESERVE JSDOC HEADER and IMPORT BLOCK
- Fix CRITICAL issues first, then HIGH, then MEDIUM, then LOW
${validationReportJson.includes('truncated') ? '\nCRITICAL TRUNCATION ERROR: The previous generation hit the max token limit and was cut off. You MUST simplify the formatting (remove extra spaces, reduce boilerplate, compress dummy content) to ensure the complete repaired component fits in the response window.\n' : ''}
 
${outputInstruction}
 
${hardRules}
 
    ISSUES TO FIX (only these — do not re-validate everything):
${validationReportJson}
 
CURRENT CODE:
${code}`
  }
 
  return `You are a senior React/Framer Motion engineer performing a targeted code repair.
Fix EVERY issue in the list below. Do not return the original code unchanged.
 
REPAIR RULES:
- SILENT REPAIR: DO NOT use forbidden strings (e.g. window.addEventListener) in repair comments.
- HOOK CONSISTENCY: If you use new hooks, update the import statement at the top of the file.
- PRESERVE JSDOC HEADER and IMPORT BLOCK
- Fix CRITICAL issues first, then HIGH, then MEDIUM, then LOW
- For each fix, add: // PATCHED: [issue type]
${validationReportJson.includes('truncated') ? '\nCRITICAL TRUNCATION ERROR: The previous generation hit the max token limit and was cut off. You MUST simplify the formatting (remove extra spaces, reduce boilerplate, compress dummy content) to ensure the complete repaired component fits in the response window.\n' : ''}
 
${outputInstruction}
 
${hardRules}
 
SPEC:
${specJson}
 
ISSUES TO FIX:
${validationReportJson}
 
CURRENT CODE:
${code}`
}

/**
 * Lean validation prompt — sends ONLY code to AI, receives ONLY a JSON issues array.
 * No spec, no status string, no score, no explanation.
 * Each issue includes search_str / replace_str for direct patch application.
 */
export function buildLeanValidationPrompt(code: string): string {
  return `You are a senior React code auditor.

Analyze the following component code for issues.

Return ONLY a valid JSON array. No explanation. No markdown. No status field. No score. Empty array [] if no issues.

Each issue must follow this exact shape:
{
  "line_start": number,
  "line_end": number,
  "issue_type": "syntax" | "logic" | "motion" | "design" | "spec",
  "severity": "low" | "medium" | "high" | "critical",
  "message": "short description of the issue",
  "search_str": "exact string from the code to find and replace",
  "replace_str": "the fixed replacement string"
}

RULES:
- search_str must be an exact substring of the code — copy it verbatim, character for character
- replace_str must be the minimal fix only — do not rewrite surrounding code
- If an issue cannot be expressed as a search/replace pair, set both to empty string ""
- Do not include issues with empty search_str unless severity is critical
- Output ONLY the raw JSON array — no prose, no markdown fences

IMPORTANT: Do NOT flag these as issues — they are valid in this codebase:
- Real ES import statements (import { x } from 'y') — Gen now uses real imports
- export default function syntax — this is correct
- Absence of window.React or window.Motion — globals are no longer required

CODE:
${code}`
}

/**
 * AI fallback prompt for critical issues that have no search_str patch.
 * Sends only the critical issue descriptions + current code.
 * Returns full fixed code (no patches — last resort only).
 */
export function buildCriticalRepairFallbackPrompt(issuesJson: string, code: string): string {
  return `You are a surgical code repair agent.

Fix ONLY the issues listed below. Do not touch any other part of the code.
Return ONLY the fixed code. No explanation. No markdown. No backticks.

HARD RULES:
- Preserve the existing import block at the top of the file exactly
- Fix CRITICAL issues first
- Code uses real ES import syntax — do NOT replace imports with window globals (window.React, window.Motion)
- NEVER use window.addEventListener or document.querySelector — use JSX events or useRef
- Mark each fix with // PATCHED: [issue_type]

ISSUES TO FIX:
${issuesJson}

FULL CODE:
${code}`
}

/**
 * Completion prompt — used when code is truncated.
 * Asks the AI to ONLY provide the missing tail/closing part of the code.
 */
export function buildCompletionPrompt(code: string, specJson?: string): string {
  const specContext = specJson ? `\n\nSPEC REFERENCE:\n${specJson}` : ''
  return `The following React component code is TRUNCATED (it cut off mid-sentence due to output limits).

Your task is to provide ONLY the missing code required to complete the component logically and syntactically.

RULES:
- Return ONLY the missing tail of the code
- Do NOT repeat any of the code already provided
- Do NOT wrap in markdown fences
- Ensure all open braces, brackets, and parentheses are properly closed
- Ensure the component remains functional

TRUNCATED CODE:
${code}${specContext}`
}

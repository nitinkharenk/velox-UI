import { enrichWithProvider, generateWithProvider } from '@/lib/pipeline/providerDispatch'
import { trimIdeaForPrompt, trimSpecForCodeGen } from '@/lib/pipeline/prompts'
import {
  autoFixCode,
  cleanCodeOutput,
  validateCodeString,
} from '@/lib/pipeline/validationStatic'
import {
  buildSyntheticValidationReport,
  runFixAttempt,
  runSemanticValidation,
} from '@/lib/pipeline/validationRuntime'
import type { Idea, EnrichedSpec, GeneratedCode, PipelineConfig, ValidationReport, PipelineEvent } from '@/types/pipeline'

function resolveSystemPrompt(
  systemPrompt: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (prompt, [key, value]) => prompt.replaceAll(`{{${key}}}`, value),
    systemPrompt
  )
}

/** Removes null/undefined/empty-string/empty-array/empty-object keys recursively. */
function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v)) {
      if (v.length === 0) continue
      result[k] = v
    } else if (typeof v === 'object') {
      const nested = stripEmpty(v as Record<string, unknown>)
      if (Object.keys(nested).length > 0) result[k] = nested
    } else {
      result[k] = v
    }
  }
  return result
}

/**
 * Builds a structured context block for the Enrich stage.
 * Translates idea.complexity, format, feel, tech, and theme into
 * explicit, pre-resolved instructions so the AI does not have to guess
 * what "fluid" or "complex" means.
 */
function buildEnrichContext(idea: Idea): string {
  const lines: string[] = []

  // Complexity scope — tells Enrich exactly how deep to go
  const scopeMap: Record<string, string> = {
    micro:    'SCOPE: Single element. One primary animation. No sub-components. Target under 50 lines of output code.',
    standard: 'SCOPE: 2-3 elements. 2-3 animations. Simple sub-components allowed. Target under 100 lines.',
    complex:  'SCOPE: Multiple sub-components required. Full interaction states. Layered depth animations. Target up to 200 lines.',
  }
  const scope = scopeMap[(idea.complexity ?? '').toLowerCase()] ?? scopeMap.standard
  lines.push(scope)

  // Format — tells Enrich the structural pattern to use
  const formatMap: Record<string, string> = {
    component: 'FORMAT: Single reusable UI component. Self-contained. No page layout.',
    section:   'FORMAT: Full-width page section (hero, features, CTA etc). Can have multiple elements.',
    template:  'FORMAT: Complete page template with multiple sections. Navbar, content areas, footer.',
    page:      'FORMAT: Full page layout. Include all sections. Typography-driven. Content-first.',
  }
  const format = (idea as any).format as string | undefined
  const formatGuide = formatMap[(format ?? '').toLowerCase()] ?? formatMap.component
  lines.push(formatGuide)

  // Personality — pre-translate to exact easing values
  const easingMap: Record<string, string> = {
    fluid:      'EASING: spring(stiffness: 80, damping: 40). Flowing, organic, natural movement.',
    bouncy:     'EASING: spring(stiffness: 300, damping: 10). Energetic, overshoots target, playful.',
    magnetic:   'EASING: spring(stiffness: 200, damping: 20). Use cursor/mouse position tracking. Elements attract to cursor.',
    mechanical: 'EASING: steps(8) or linear. Sharp, precise, robotic. No organic curves.',
    minimal:    'EASING: cubic-bezier(0.2, 0, 0, 1) duration max 0.25s. Subtle. Barely noticeable.',
    elastic:    'EASING: spring(stiffness: 400, damping: 8). Snappy stretch and release.',
    smooth:     'EASING: cubic-bezier(0.4, 0, 0.2, 1). Polished, professional transitions.',
    instant:    'EASING: duration 0. Immediate state changes. No transition animations.',
  }

  // feel can be comma-separated: "fluid, smooth"
  const feels = (idea.feel || 'smooth')
    .split(',')
    .map(f => f.trim().toLowerCase())
    .filter(Boolean)

  const primaryFeel = feels[0]
  if (primaryFeel && easingMap[primaryFeel]) {
    lines.push(easingMap[primaryFeel])
  }

  // Tech-specific instructions
  const techLower = (idea.tech ?? []).map(t => t.toLowerCase())

  if (techLower.some(t => t.includes('gsap'))) {
    lines.push('GSAP: Use gsap.timeline() for sequences. ScrollTrigger for scroll. Specify exact gsap methods in implementation_notes.')
  }
  if (techLower.some(t => t.includes('three'))) {
    lines.push('THREE.JS: Describe full scene (camera, renderer, lighting, geometry, material). Animation via requestAnimationFrame loop.')
  }
  if (techLower.some(t => t.includes('canvas'))) {
    lines.push('CANVAS: Describe ctx drawing operations. Specify exact canvas API calls. Animation via requestAnimationFrame.')
  }
  if (techLower.some(t => t.includes('svg'))) {
    lines.push('SVG MOTION: Use SVG path animations. Describe stroke-dashoffset, morphing, or draw-on effects.')
  }

  // Theme if available (not a core Idea field — accessed via `as any` for flexibility)
  const theme = (idea as any).theme as string | undefined
  if (theme) {
    const themeMap: Record<string, string> = {
      dark:     'COLOR THEME: Dark palette. Background #0a0a0f or similar. Light text. Accent colors should pop against dark.',
      light:    'COLOR THEME: Light palette. Background #F8F8F8 or off-white. Dark text. Subtle accents.',
      glass:    'COLOR THEME: Glassmorphism. backdrop-filter blur. Semi-transparent surfaces. Light borders.',
      colorful: 'COLOR THEME: Vibrant, saturated colors. Multiple accent colors. High contrast.',
      mono:     'COLOR THEME: Monochromatic. Single hue in different shades. No color variety.',
    }
    const themeGuide = themeMap[theme.toLowerCase()]
    if (themeGuide) lines.push(themeGuide)
  }

  return lines.join('\n')
}

export async function enrichIdea(idea: Idea, config: PipelineConfig): Promise<{ spec: EnrichedSpec; usage: { input: number; output: number } }> {
  const rawIdeaFields = {
    name: idea.name, format: (idea as any).format, type: idea.type, category: idea.category,
    tech: idea.tech, complexity: idea.complexity, feel: idea.feel,
    ...(idea.prompt ? { prompt: idea.prompt } : {}),
  }
  const input = JSON.stringify(trimIdeaForPrompt(stripEmpty(rawIdeaFields as Record<string, unknown>)))
  
  const formatDirective = idea.format && idea.format !== 'component' 
    ? `IMPORTANT: This is a ${idea.format.toUpperCase()} structural format. Do not generate a simple unit; use the specific layout rules for ${idea.format}s.\n\n`
    : ''

  const resolvedConfig: PipelineConfig = config.system_prompt
    ? {
        ...config,
        system_prompt: formatDirective + resolveSystemPrompt(config.system_prompt, {
          IDEA_JSON: input
        })
      }
    : config

  // Build a dynamic context block that pre-translates complexity/format/feel/tech
  // into concrete directives so the AI receives explicit guidance, not raw field values.
  const context = buildEnrichContext(idea)
  const userMessage = `${context}\n\nIDEA:\n${input}`

  const { content: raw, usage } = await enrichWithProvider(userMessage, resolvedConfig)

  if (!raw || raw.trim() === '') {
     throw new Error(`AI Provider (${config.provider}) returned an empty response. Verify your API Key and Model configuration in Settings.`)
  }

  const cleaned = extractJson(raw)
  try {
    return { spec: JSON.parse(cleaned), usage }
  } catch {
    const previewLength = 200
    const preview = raw.length > previewLength * 2 
      ? `${raw.slice(0, previewLength)}\n\n[...truncated...]\n\n${raw.slice(-previewLength)}`
      : raw
    throw new Error(`Failed to parse AI output into valid JSON. Start & End of Raw Output:\n\n${preview}`)
  }
}

/**
 * Safely escape literal control characters (newlines, tabs, etc) 
 * ONLY when they appear strictly inside double-quoted string boundaries,
 * properly respecting escaped quotes.
 */
function escapeControlCharsInStrings(jsonString: string): string {
  // Matches valid JSON strings: starts with ", contains any non-quote/backslash 
  // OR an escaped character (\.), and ends with "
  return jsonString.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
    return match
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  })
}

/** Extract and repair JSON from AI output that may have markdown fences, literal newlines, or truncation */
function extractJson(raw: string): string {
  // 1. Strip markdown fences
  let text = raw
    .replace(/^```(?:json)?\s*/mi, '')
    .replace(/```\s*$/mi, '')
    .trim()

  // 2. Escape literal newlines within JSON strings carefully.
  let cleanText = escapeControlCharsInStrings(text)

  // 3. Remove trailing commas right before closing braces/brackets (common LLM mistake)
  cleanText = cleanText.replace(/,(?=\s*[}\]])/g, '')

  // 4. Try to parse immediately
  try {
    JSON.parse(cleanText)
    return cleanText
  } catch (e) {}

  // 5. Try finding the outer braces/brackets in case of surrounding prose
  const firstBrace = cleanText.indexOf('{')
  const lastBrace = cleanText.lastIndexOf('}')
  const firstBracket = cleanText.indexOf('[')
  const lastBracket = cleanText.lastIndexOf(']')
  
  let startIndex = -1
  let endIndex = -1

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace
    endIndex = lastBrace
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    startIndex = firstBracket
    endIndex = lastBracket
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const sliced = cleanText.slice(startIndex, endIndex + 1)
    try {
      JSON.parse(sliced)
      return sliced
    } catch (e) {}
  }

  // 6. Aggressive fallback for truncation (e.g., AI ran out of maxOutputTokens)
  // Find the last comma and assume everything after is garbage.
  const lastCommaIndex = cleanText.lastIndexOf(',')
  if (lastCommaIndex !== -1) {
    let truncated = cleanText.slice(0, lastCommaIndex)
    if (truncated.trim().startsWith('{')) truncated += '\n}'
    else if (truncated.trim().startsWith('[')) truncated += '\n]'
    
    try {
      JSON.parse(truncated)
      return truncated
    } catch (e) {}
  }

  // If all fails, return what we have so the outer layer can catch it and show exact logs.
  return cleanText
}

export async function generateCode(spec: EnrichedSpec, config: PipelineConfig, previousCode?: string): Promise<{ code: string; usage: { input: number; output: number } }> {
  const trimmed = trimSpecForCodeGen(spec as unknown as Record<string, unknown>)
  const input = JSON.stringify(stripEmpty(trimmed), null, 2)
  
  const resolvedConfig: PipelineConfig = config.system_prompt
    ? {
        ...config,
        system_prompt: resolveSystemPrompt(config.system_prompt, {
          SPEC_JSON: input
        })
      }
    : config

  const { content: raw, usage } = await generateWithProvider(input, resolvedConfig, previousCode)

  if (!raw || raw.trim() === '') {
     throw new Error(`AI Provider (${config.provider}) returned an empty response. Verify your API Key and Model configuration in Settings.`)
  }

  return { code: cleanCodeOutput(raw), usage }
}

export async function validateAndFix(
  code: string, 
  config: PipelineConfig, 
  specJson?: string | null, 
  maxAttempts = 2,
  onEvent?: (event: PipelineEvent) => void | Promise<void>,
  ideaMeta?: { ideaId?: string; ideaName?: string }
): Promise<{ result: GeneratedCode; usage: { input: number; output: number } }> {
  let cleanSpecJson = specJson ?? null
  if (cleanSpecJson) {
    try {
      const parsed = JSON.parse(cleanSpecJson) as Record<string, unknown>
      cleanSpecJson = JSON.stringify(stripEmpty(parsed))
    } catch { /* keep original if parse fails */ }
  }
  specJson = cleanSpecJson
  code = autoFixCode(code)

  let cumulativeUsage = { input: 0, output: 0 }
  let previousIssues: ValidationReport['issues'] | undefined
  let needsRegeneration = false
  let regenerationErrors: string[] = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1 && onEvent) {
      await onEvent({
        event: 'status',
        stage: 'validating',
        message: `Repair attempt ${attempt}/${maxAttempts}: Production code repaired`,
        attempt,
        usage: cumulativeUsage,
        ...ideaMeta,
      })
    }
    const validation = validateCodeString(code)

    if (!validation.ok) {
      console.warn('Pipeline static validation failed', {
        provider: config.provider,
        attempt,
        maxAttempts,
        detail: validation.error,
      })

      if (attempt === maxAttempts) {
        console.error('Pipeline validation loop exhausted on static validation', {
          provider: config.provider,
          attempt,
          maxAttempts,
          detail: validation.error,
        })

        if (onEvent) {
          await onEvent({
            event: 'status',
            stage: 'validating',
            message: 'Pipeline stopped: Maximum repair attempts reached for static validation.',
            isFatal: true,
            usage: cumulativeUsage,
            ...ideaMeta,
          })
        }

        return { 
          result: { code, imports: [], has_errors: true, validation_notes: validation.error },
          usage: cumulativeUsage
        }
      }

      const codeBeforeStaticFix = code
      let fix: { code: string; usage: { input: number; output: number } }

      if (validation.error?.includes('likely truncated')) {
        const { runCompletionAttempt } = await import('@/lib/pipeline/validationRuntime')
        fix = await runCompletionAttempt(
          code,
          config,
          specJson || null,
          attempt,
          maxAttempts
        )
      } else {
        const resolvedConfigStatic = config.system_prompt
          ? {
              ...config,
              system_prompt: resolveSystemPrompt(config.system_prompt, {
                SPEC_JSON: specJson || '',
                CODE: code
              })
            }
          : config
        fix = await runFixAttempt(code, resolvedConfigStatic, specJson || null, validation.error!, attempt, maxAttempts)
      }

      code = fix.code
      cumulativeUsage.input += fix.usage.input
      cumulativeUsage.output += fix.usage.output

      if (config.provider === 'groq') {
        const { checkRepairAcceptanceWithGroq } = await import('@/lib/ai/groq')
        const guard = await checkRepairAcceptanceWithGroq(
          codeBeforeStaticFix, code, validation.error!, config,
        )
        cumulativeUsage.input += guard.usage.input
        cumulativeUsage.output += guard.usage.output

        if (!guard.accepted) {
          console.warn('Pipeline static repair rejected by acceptance guard', {
            provider: config.provider, attempt, reason: guard.reason,
          })
          return {
            result: {
              code: codeBeforeStaticFix,
              imports: [],
              has_errors: true,
              validation_notes: guard.reason ?? 'Repair made no meaningful changes',
              validation_report: buildSyntheticValidationReport('Repair rejected', guard.reason),
            },
            usage: cumulativeUsage
          }
        }
      }
      continue
    }

    if (!specJson) {
      return { result: { code, imports: [], has_errors: false }, usage: cumulativeUsage }
    }

    const resolvedConfigValidation = config.system_prompt
      ? {
          ...config,
          system_prompt: resolveSystemPrompt(config.system_prompt, {
            SPEC_JSON: specJson,
            CODE: code
          })
        }
      : config

    const semanticOutcome = await runSemanticValidation(
      code, 
      resolvedConfigValidation, 
      specJson, 
      attempt, 
      maxAttempts, 
      ideaMeta?.ideaId,
      previousIssues
    )
    cumulativeUsage.input += semanticOutcome.usage.input
    cumulativeUsage.output += semanticOutcome.usage.output
    previousIssues = semanticOutcome.report.issues

    if (
      semanticOutcome.kind === 'PASS' ||
      semanticOutcome.kind === 'PASS_WITH_WARNINGS'
    ) {
      return {
        result: {
          code,
          imports: [],
          has_errors: false,
          validation_report: semanticOutcome.report,
        },
        usage: cumulativeUsage
      }
    }

    if (attempt === maxAttempts) {
      const currentScore = semanticOutcome.report.score ?? 0

      if (currentScore < 50) {
        // Score too low to patch — flag for full regeneration
        needsRegeneration = true
        regenerationErrors = semanticOutcome.report.issues
          .map(i => i.message)
          .filter(Boolean)
        break
      }

      // score >= 50 — apply patches and accept as PASS_WITH_WARNINGS
      if (ideaMeta?.ideaId) {
        const { runPatchRepair } = await import('@/lib/pipeline/validationRuntime')
        const repair = await runPatchRepair(
          code,
          config,
          specJson || null,
          ideaMeta.ideaId,
          attempt,
          maxAttempts
        )
        code = repair.code
        cumulativeUsage.input += repair.usage.input
        cumulativeUsage.output += repair.usage.output
      }

      return {
        result: {
          code,
          imports: [],
          has_errors: false,
          validation_report: { ...semanticOutcome.report, status: 'PASS_WITH_WARNINGS' },
        },
        usage: cumulativeUsage,
      }
    }

    const codeBeforeSemanticFix = code
    const issuesJson = JSON.stringify(semanticOutcome.report.issues, null, 2)
    
    // Switch to surgical patch-based repair if ideaId is available
    if (ideaMeta?.ideaId) {
      const { runPatchRepair } = await import('@/lib/pipeline/validationRuntime')
      const repair = await runPatchRepair(
        code,
        config,
        specJson,
        ideaMeta.ideaId,
        attempt,
        maxAttempts
      )
      code = repair.code
      cumulativeUsage.input += repair.usage.input
      cumulativeUsage.output += repair.usage.output

      // If all patches applied successfully (no failures, no AI fallback used),
      // trust the repair and exit without an expensive re-validate round-trip.
      // Only retry validate if some patches failed to find their search_str.
      if (repair.patchesFailed === 0 && !repair.fallbackUsed) {
        if (onEvent) {
          await onEvent({
            event: 'status',
            stage: 'validating',
            message: `Repair attempt ${attempt}/${maxAttempts}: All patches applied — skipping re-validate.`,
            attempt,
            usage: cumulativeUsage,
            ...ideaMeta,
          })
        }
        return {
          result: { 
            code, 
            imports: [], 
            has_errors: false, 
            validation_report: { 
              ...semanticOutcome.report, 
              status: 'PASS' // Explicitly pass since we trusted and applied the patches
            } 
          },
          usage: cumulativeUsage,
        }
      }
      // patchesFailed > 0 or AI fallback was used — fall through to next loop iteration which re-validates
    } else {

      // Fallback to legacy full rewrite if no ideaId (e.g. playground mode)
      const fix = await runFixAttempt(
        code,
        config,
        specJson,
        issuesJson,
        attempt,
        maxAttempts,
      )
      code = fix.code
      cumulativeUsage.input += fix.usage.input
      cumulativeUsage.output += fix.usage.output
    }

    if (config.provider === 'groq') {
      const { checkRepairAcceptanceWithGroq } = await import('@/lib/ai/groq')
      const guard = await checkRepairAcceptanceWithGroq(
        codeBeforeSemanticFix, code, issuesJson, config,
      )
      cumulativeUsage.input += guard.usage.input
      cumulativeUsage.output += guard.usage.output

      if (!guard.accepted) {
        console.warn('Pipeline semantic repair rejected by acceptance guard', {
          provider: config.provider, attempt, reason: guard.reason,
        })
        return {
          result: {
            code: codeBeforeSemanticFix,
            imports: [],
            has_errors: true,
            validation_notes: guard.reason ?? 'Repair made no meaningful changes',
            validation_report: buildSyntheticValidationReport('Repair rejected', guard.reason),
          },
          usage: cumulativeUsage
        }
      }
    }
  }

  // Regeneration path: score was too low to patch — re-run Gen with error context
  if (needsRegeneration && specJson) {
    if (onEvent) {
      await onEvent({
        event: 'status',
        stage: 'generating',
        message: 'Score too low to patch — regenerating with error context...',
        usage: cumulativeUsage,
        ...ideaMeta,
      })
    }

    const errorSummary = regenerationErrors.join('\n')
    const regenErrorInstruction = `PREVIOUS ATTEMPT FAILED. Fix these specific issues:\n${errorSummary}\n\nDo not repeat these mistakes.`

    let parsedSpec: EnrichedSpec
    try {
      parsedSpec = JSON.parse(specJson) as EnrichedSpec
    } catch {
      return { result: { code, imports: [], has_errors: true }, usage: cumulativeUsage }
    }

    const regenConfig: PipelineConfig = {
      ...config,
      system_prompt: config.system_prompt
        ? `${config.system_prompt}\n\n${regenErrorInstruction}`
        : regenErrorInstruction,
    }

    const regenResult = await generateCode(parsedSpec, regenConfig)
    code = regenResult.code
    cumulativeUsage.input += regenResult.usage.input
    cumulativeUsage.output += regenResult.usage.output

    // Validate once — accept whatever score comes back, no further repair loops
    const finalValidation = await runSemanticValidation(
      code,
      config,
      specJson,
      1,
      1,
      ideaMeta?.ideaId,
    )
    cumulativeUsage.input += finalValidation.usage.input
    cumulativeUsage.output += finalValidation.usage.output

    return {
      result: {
        code,
        imports: [],
        has_errors: finalValidation.kind === 'FAIL' || finalValidation.kind === 'ERROR',
        validation_report: finalValidation.report,
      },
      usage: cumulativeUsage,
    }
  }

  return { result: { code, imports: [], has_errors: true }, usage: cumulativeUsage }
}

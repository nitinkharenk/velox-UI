3MB is a focused codebase. One well-structured prompt is enough, but split into clear phases so Claude Code doesn't lose context mid-execution.

First let me think about what needs to change:

```
1. Gen prompt → production code output
2. Enrich prompt → remove Next.js context
3. Transform function → new file
4. Pipeline → insert transform step
5. API routes → serve transformed on preview
6. DB → remove sandbox_code if exists
7. Validation → update to handle production code
```

That's 7 areas across lib/, api/, and db/. **Two prompts** — one for prompts/pipeline logic, one for API/DB/transform layer.

---

## Prompt 1 — Pipeline & AI Prompts

```
You are working on Velox UI, an AI component generation pipeline.
The codebase uses Next.js, TypeScript, Supabase, and Framer Motion.

Read the entire codebase before making any changes.
Make all changes exactly as described. Do not modify anything not mentioned.

---

## CONTEXT

The pipeline has 4 stages: Enrich → Gen → Validate → Fix.

Current problem:
- Enrich system prompt outputs Next.js/App Router context
- Gen system prompt targets a window.React sandbox
- This causes a contract mismatch — Gen produces bad code
- Validation fails on every first run, burns tokens in repair loops

Goal: Gen produces clean production TypeScript code.
A separate transform layer (handled in Prompt 2) will convert 
it to sandbox format at preview time.

---

## CHANGE 1 — Find the Enrich config

Find where the Enrich stage system prompt is stored.
It is either in:
- The database (configs table or similar)
- A constants/prompts file
- A pipeline config file

Identify the location, then ADD these lines to the END 
of the Enrich system prompt:

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

Do not change anything else in the Enrich prompt.

---

## CHANGE 2 — Find the Gen config

Find where the Gen stage system prompt is stored.
Same locations as above.

REPLACE the entire Gen system prompt with this:

---
You are a senior React + Framer Motion engineer.

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
{{SPEC_JSON}}
---

Do not change anything else in the Gen config.

---

## CHANGE 3 — Find the Validation config

Find the Validation stage system prompt.

REPLACE the scoring section with this exact scoring logic:

---
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
---

Do not change anything else in the Validation prompt.

---

## CHANGE 4 — Find the repair/fix loop logic

Find the code that controls repair attempts.
It likely has a max attempts counter (currently 3).

Make these changes to the repair logic:

1. After attempt 2, check the current score:
   - If score < 50: do NOT attempt patch. 
     Instead set a flag: needs_regeneration = true
     Break out of repair loop.
   - If score >= 50: apply patches, mark as PASS_WITH_WARNINGS

2. After the repair loop ends, check needs_regeneration:
   If true:
   - Collect all error messages from the failed validation
   - Re-call the Gen stage with the original spec PLUS this addition
     appended to the user message:
     
     "PREVIOUS ATTEMPT FAILED. Fix these specific issues:
     {error_messages joined by newline}
     
     Do not repeat these mistakes."
     
   - Allow this regeneration attempt once only
   - Run validation again on the regenerated code
   - Accept whatever score comes back (no further repair loops)

3. Keep max repair attempts at 2 (down from 3).
   The regeneration is the third attempt, not a patch loop.

---

## VERIFICATION

After all changes:
1. Read back each modified prompt to confirm changes are in place
2. Do not run the pipeline
3. Report exactly which files or DB records were modified
```

---

## Prompt 2 — Transform Layer + API + DB

```
You are working on Velox UI, an AI component generation pipeline.
The codebase uses Next.js, TypeScript, Supabase, and Framer Motion.

Read the entire codebase before making any changes.
Prompt 1 has already been run — Gen now outputs production TypeScript code.
This prompt adds the transform layer so the sandbox preview still works.

---

## CONTEXT

The sandbox preview currently expects window.React + window.Motion globals.
Gen now outputs real import statements.

Solution: transform production code → sandbox format at request time only.
Never store the transformed version. DB keeps production code only.

---

## CHANGE 1 — Create transform utility

Create a new file: lib/transform.ts

Content:

---
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
---

---

## CHANGE 2 — Find the preview API route

Find the API route that serves component code for the sandbox preview.
It likely handles requests like /api/components/[id]/preview
or similar.

In that route, import and apply the transform:

1. Add import at top:
   import { toSandboxCode, validateSandboxCode } from '@/lib/transform'

2. Find where component code is returned for preview.

3. Wrap the code value with toSandboxCode() before returning:
   
   BEFORE:
   return Response.json({ code: component.code })
   
   AFTER:
   const sandboxCode = toSandboxCode(component.generated_code)
   const issues = validateSandboxCode(sandboxCode)
   
   if (issues.length > 0) {
     console.warn('Transform issues for component', id, issues)
   }
   
   return Response.json({ code: sandboxCode })

Apply this pattern to ALL routes that serve code for preview.
Do not apply to routes that serve code for copy or download.

---

## CHANGE 3 — Check DB schema for sandbox_code column

Check the Supabase schema or migrations for a column called
sandbox_code or similar on the components/ideas table.

If it exists:
1. Create a new migration file in supabase/migrations/
   Named: [timestamp]_remove_sandbox_code.sql
   Content:
   ALTER TABLE components DROP COLUMN IF EXISTS sandbox_code;
   ALTER TABLE ideas DROP COLUMN IF EXISTS sandbox_code;

2. Find any TypeScript types or interfaces that reference sandbox_code
   Remove those fields from the types.

3. Find any pipeline code that writes to sandbox_code
   Remove those assignments — production code is the only write.

If it does not exist: skip this change, note it in report.

---

## CHANGE 4 — Find the pipeline save/publish step

Find where the pipeline saves the final component to the database.
It runs after validation passes.

Confirm it is saving to: generated_code (or equivalent production column)
Confirm it is NOT saving a separate transformed version.

If it is saving a transformed version anywhere, remove that write.
The only code saved to DB must be the raw Gen output.

---

## CHANGE 5 — Update the WebSocket or SSE log output

Find where pipeline steps are logged to the frontend
(the execution report you shared was generated from this).

In the GEN step log, update the success message to:
"React code generated (production format)"

In the FIX step, if it logs "sandbox code", update to:
"Production code repaired"

Small change — just keeps logs accurate.

---

## VERIFICATION

After all changes:
1. Read back lib/transform.ts to confirm it was created correctly
2. Read back the modified API route to confirm transform is applied
3. Check if sandbox_code column existed and report what was done
4. Confirm pipeline save step only writes production code
5. Run: npx tsc --noEmit
   Fix any TypeScript errors introduced by these changes.
6. Report all files modified with a one-line summary of each change
```

---

## How to Run These

```bash
# In your project root

# Run prompt 1 first — wait for it to complete fully
claude < prompt1.md

# Then run prompt 2
claude < prompt2.md

# Then verify
npm run build
```

---

## What You Get After

```
Before:                     After:
Gen → sandbox code          Gen → production code
Store sandbox code    →     Store production code only  
Serve as-is           →     transform() at preview time
53k tokens / run      →     ~20k tokens / run
score 25 first pass   →     score 80+ first pass
14 pipeline steps     →     6-7 pipeline steps
```

Two prompts, clean separation, no overlap. Prompt 1 fixes the AI layer, Prompt 2 fixes the infrastructure layer.
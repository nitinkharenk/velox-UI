# Velox Pipeline — Patch-Based Validation & Repair Refactor

## Role
You are a senior backend engineer refactoring an AI pipeline. Your job is to make **surgical changes only** to the validation and repair stages. You must not touch any other part of the codebase unless it is directly required by these two stages.

---

## Phase 1 — READ AND UNDERSTAND FIRST (do not edit anything yet)

Before writing a single line of code, you must fully understand the current system.

### 1.1 — Map the pipeline flow
Find and read every file related to the pipeline. Look for:
- The main pipeline orchestrator (the file that calls generate → validate → repair in sequence)
- The validate stage function/handler
- The repair stage function/handler
- Any shared utility that builds prompts or calls the AI model

Report back:
```
PIPELINE ORCHESTRATOR: <file path>
VALIDATE STAGE: <file path> + <function name>
REPAIR STAGE: <file path> + <function name>
PROMPT BUILDER: <file path> (if exists)
AI CALLER: <file path> + <function name>
```

### 1.2 — Map the Supabase tables
Find the Supabase schema or table definitions. Look in:
- `/lib/supabase.ts` or `/lib/db.ts`
- Any migration files
- Direct `.from('table_name')` calls in the validate and repair files

Report every table and column that validate and repair currently READ from or WRITE to:
```
TABLE: components
  READ: id, code, status
  WRITE: code, status

TABLE: <other_table_if_any>
  READ: ...
  WRITE: ...
```

### 1.3 — Understand what validate currently sends to the AI
Copy the exact current validate prompt here. Do not paraphrase. Show the full string including how variables are interpolated.

### 1.4 — Understand what repair currently sends to the AI
Copy the exact current repair prompt here. Same rule — full string, exact interpolation.

### 1.5 — Understand what data flows between stages
Answer these questions exactly:
- What does validate receive as input? (function arguments)
- What does validate return? (return value or what it writes to Supabase)
- What does repair receive as input? (function arguments)
- What does repair return? (return value or what it writes to Supabase)

---

## Phase 2 — PLAN THE CHANGES (do not edit anything yet)

Based on your Phase 1 findings, plan exactly what needs to change.

### 2.1 — New Supabase tables needed
You will need two new tables. Before creating them, check if they already exist.

**Table: component_issues**
```sql
create table component_issues (
  id uuid primary key default gen_random_uuid(),
  component_id uuid references components(id) on delete cascade,
  stage text not null,           -- 'validate' | 'repair'
  line_start integer not null,
  line_end integer not null,
  issue_type text not null,      -- 'syntax' | 'logic' | 'style' | 'other'
  description text not null,
  created_at timestamptz default now()
);
```

**Table: component_patches**
```sql
create table component_patches (
  id uuid primary key default gen_random_uuid(),
  component_id uuid references components(id) on delete cascade,
  search_str text not null,
  replace_str text not null,
  applied boolean default false,
  created_at timestamptz default now()
);
```

If these tables already exist with different column names, **do not recreate them**. Adapt the implementation to use the existing columns.

### 2.2 — Write the change plan
List every file you will touch and exactly what you will change in each:
```
FILE: <path>
CHANGE: Replace validate prompt to return issues array instead of full fixed code
LINES AFFECTED: <approximate line range>

FILE: <path>  
CHANGE: Replace repair to fetch only flagged snippets, return patches array
LINES AFFECTED: <approximate line range>
```

Do not proceed to Phase 3 until this plan is confirmed.

---

## Phase 3 — IMPLEMENT (surgical edits only)

### 3.1 — Create the new tables
Run the SQL for the two new tables in Supabase. Only run this if the tables do not exist.

### 3.2 — Refactor the validate stage

**New validate behavior:**
1. Receive `componentId: string` (not full code)
2. Fetch only `id, code` from `components` table
3. Split code into numbered lines for the prompt
4. Send this prompt to the AI:

```
You are a code validator. Analyze the following component code.

Return ONLY a valid JSON array of issues. No explanation. No markdown. No fixed code.
If there are no issues, return an empty array: []

Each issue must follow this exact shape:
{ "line_start": number, "line_end": number, "issue_type": "syntax"|"logic"|"style"|"other", "description": string }

CODE (lines are numbered):
<insert numbered code lines here>
```

5. Parse the JSON array response
6. Insert each issue into `component_issues` table with `stage: 'validate'`
7. Return `{ componentId, issueCount: issues.length }` — never return full code

**TypeScript signature must become:**
```typescript
async function validateComponent(componentId: string): Promise<{
  componentId: string
  issueCount: number
}>
```

### 3.3 — Refactor the repair stage

**New repair behavior:**
1. Receive `componentId: string`
2. Fetch `id, code` from `components`
3. Fetch all issues from `component_issues` where `component_id = componentId`
4. If no issues exist, mark component status as `'repaired'` and return early
5. Extract only the flagged line ranges from the code
6. Send this prompt to the AI:

```
You are a code repair agent. Fix only the broken snippets below.

Return ONLY a valid JSON array of patches. No explanation. No markdown. No full file.
If a snippet needs no fix, omit it from the array.

Each patch must follow this exact shape:
{ "search_str": "exact string to find", "replace_str": "fixed replacement string" }

BROKEN SNIPPETS:
<insert JSON of { line_start, line_end, issue_type, description, snippet } for each issue>
```

7. Parse the patches array
8. Apply each patch:
```typescript
let fixedCode = component.code
for (const patch of patches) {
  if (fixedCode.includes(patch.search_str)) {
    fixedCode = fixedCode.replace(patch.search_str, patch.replace_str)
  } else {
    console.warn(`[repair] patch not applied — search_str not found`, patch.search_str)
  }
}
```
9. Insert each patch into `component_patches` with `applied: true/false`
10. Update `components` table: set `code = fixedCode`, `status = 'repaired'`
11. Return `{ componentId, patchesApplied: number, patchesFailed: number }`

**TypeScript signature must become:**
```typescript
async function repairComponent(componentId: string): Promise<{
  componentId: string
  patchesApplied: number
  patchesFailed: number
}>
```

### 3.4 — Update the pipeline orchestrator
The orchestrator currently passes full data between stages. Update only the calls to validate and repair to pass `componentId` instead. Do not change the generate stage or any other stage.

---

## Phase 4 — VERIFY

After all changes are applied, do the following checks:

- [ ] Run the pipeline with a single test component
- [ ] Confirm `component_issues` table has rows after validate runs
- [ ] Confirm `component_patches` table has rows after repair runs  
- [ ] Confirm `components.code` is updated correctly after repair
- [ ] Confirm no full code is being passed in any prompt in validate or repair
- [ ] Confirm the generate stage is completely untouched
- [ ] Check console for any `patch not applied` warnings and report them

---

## Hard Rules

- **Do not touch the generate stage**
- **Do not touch the enrich/idea stages**
- **Do not rename or drop any existing Supabase columns**
- **Do not change AI provider or model selection logic**
- **Do not refactor anything outside validate and repair unless it directly breaks**
- If you are unsure about a table column name, read it from the codebase first — never assume
- If a patch fails to apply (search_str not found), log it and continue — do not throw

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('workflows route logs failures and explains missing schema remediation', async () => {
  const routeSource = await readFile(
    path.join(process.cwd(), 'app/api/pipeline/workflows/route.ts'),
    'utf8',
  )
  const helperSource = await readFile(
    path.join(process.cwd(), 'lib/pipeline/workflowRouteErrors.ts'),
    'utf8',
  )

  assert.match(
    routeSource,
    /console\.error/,
    'Expected workflows route to log actionable server-side errors',
  )

  assert.match(
    helperSource,
    /006_pipeline_stages\.sql/,
    'Expected workflows route to mention the missing schema migration when pipelines tables are absent',
  )
})

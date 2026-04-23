import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

test('pipeline funnel widget keeps Link props serializable in server render', async () => {
  const widgetPath = path.join(
    process.cwd(),
    'components/dashboard/widgets/PipelineFunnelWidget.tsx'
  )
  const source = await readFile(widgetPath, 'utf8')

  assert.doesNotMatch(
    source,
    /onMouseEnter\s*=/,
    'Expected PipelineFunnelWidget Link elements to avoid onMouseEnter handlers in a server component'
  )
  assert.doesNotMatch(
    source,
    /onMouseLeave\s*=/,
    'Expected PipelineFunnelWidget Link elements to avoid onMouseLeave handlers in a server component'
  )
})

import test from 'node:test'
import assert from 'node:assert/strict'

import { inferPipelineStatus } from '@/lib/pipeline/runPipeline'

test('inferPipelineStatus maps validation outcomes to final pipeline status', () => {
  assert.equal(inferPipelineStatus({ has_errors: true }), 'repair_required')
  assert.equal(inferPipelineStatus({ has_errors: false, validation_report: { status: 'FAIL', score: 0, issues: [] } }), 'repair_required')
  assert.equal(inferPipelineStatus({ has_errors: false, validation_report: { status: 'PASS_WITH_WARNINGS', score: 82, issues: [] } }), 'ready_with_warnings')
  assert.equal(inferPipelineStatus({ has_errors: false, validation_report: { status: 'PASS', score: 100, issues: [] } }), 'ready')
  assert.equal(inferPipelineStatus(null), 'ready')
})

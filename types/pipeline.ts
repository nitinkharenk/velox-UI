import type { AnimationSpec, VisualSpec } from './asset'

export interface PipelineConfig {
  id: string
  name: string
  model: string
  provider: 'anthropic' | 'gemini' | 'groq' | 'ollama' | string
  base_url?: string | null
  system_prompt: string | null
  is_default: boolean
}

export type PipelineStageAction = 'enrich_spec' | 'generate_code' | 'validate_code'

export interface PipelineStageConfig {
  id?: string
  pipeline_id?: string
  step_order?: number
  name: string
  action_type: PipelineStageAction
  provider: PipelineConfig['provider']
  model: string
  system_prompt?: string | null
}

export interface WorkflowPipeline extends PipelineConfig {
  description?: string | null
  pipeline_stages?: PipelineStageConfig[]
}

export type IdeaStatus =
  | 'pending' | 'enriching' | 'enriched' | 'generating' | 'generated'
  | 'validating' | 'validated' | 'reviewing' | 'ready' | 'repair_required' | 'ready_with_warnings' | 'approved' | 'rejected' | 'failed'

export interface Idea {
  id: string
  name: string
  type: string
  category: string
  format: 'component' | 'section' | 'template' | 'page'
  tech: string[]
  complexity: 'low' | 'medium' | 'high' | 'micro' | 'standard' | 'complex'
  feel: string  // comma-separated personalities e.g. "fluid" or "fluid, smooth"
  theme?: string  // visual color theme e.g. 'dark' | 'light' | 'glass' | 'colorful' | 'mono'
  prompt?: string
  enriched_spec?: EnrichedSpec
  generated_code?: string | null
  status: IdeaStatus
  error_log?: string
  created_at?: string
  updated_at?: string
}

export interface PageSection {
  id: string
  name: string
  layout: string
  key_elements: string[]
  animation: string
}

export interface EnrichedSpec {
  name: string
  scale: 'page' | 'component'
  format: 'component' | 'section' | 'template' | 'page'
  description: string
  seo_description: string
  motion_style?: string
  visual_depth?: {
    foreground: string
    midground: string
    background: string
  }
  animation_spec: AnimationSpec
  visual_spec: VisualSpec
  implementation_notes: string
  tags: string[]
  component_structure: string
  sections?: PageSection[]
  interactions: string[]
  tech: string[]
}

export interface ValidationIssue {
  severity: 'critical' | 'major' | 'minor' | 'low' | 'medium' | 'high'
  type: string
  message: string
  line_start?: number
  line_end?: number
  section?: string
  fix?: string
  /** Exact substring to find in the code — populated by lean validate prompt */
  search_str?: string
  /** Minimal replacement string — populated by lean validate prompt */
  replace_str?: string
}

export interface ResolutionEntry {
  previous_message: string
  resolved: boolean
  resolution_note: string
}

export interface ValidationReport {
  status: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL'
  score: number
  issues: ValidationIssue[]
  resolution_report?: ResolutionEntry[]
  patched_code?: string | null
}

export interface GeneratedCode {
  code: string
  imports: string[]
  has_errors: boolean
  validation_notes?: string
  validation_report?: ValidationReport
}

export interface StructuredIdeaInput {
  name: string
  type: string
  category: string
  format?: 'component' | 'section' | 'template' | 'page'
  tech: string[]
  complexity: 'low' | 'medium' | 'high' | 'micro' | 'standard' | 'complex'
  feel: string  // comma-separated personalities e.g. "fluid" or "fluid, smooth"
  vision?: string
}

export type PipelineEvent =
  | {
      event: 'status'
      stage: string
      message: string
      ideaId?: string
      ideaName?: string
      runId?: string
      input?: string
      output?: string
      attempt?: number
      isFatal?: boolean
      usage?: { input: number; output: number }
    }
  | {
      event: 'enriched'
      spec: EnrichedSpec
      ideaId?: string
      ideaName?: string
      runId?: string
      input?: string
      output?: string
      usage?: { input: number; output: number }
    }
  | {
      event: 'generated'
      code: string
      ideaId?: string
      ideaName?: string
      runId?: string
      input?: string
      output?: string
      usage?: { input: number; output: number }
    }
  | {
      event: 'validated'
      code: string
      has_errors: boolean
      validation_notes?: string
      validation_report?: ValidationReport
      ideaId?: string
      ideaName?: string
      runId?: string
      input?: string
      output?: string
      isFatal?: boolean
      usage?: { input: number; output: number }
    }
  | {
      event: 'ready'
      message: string
      status: Extract<IdeaStatus, 'ready' | 'ready_with_warnings' | 'reviewing'>
      ideaId: string
      code: string
      ideaName?: string
      runId?: string
      usage?: { input: number; output: number }
    }
  | {
      event: 'repair_required'
      message: string
      status: 'repair_required'
      ideaId: string
      has_errors?: boolean
      issues?: ValidationIssue[]
      ideaName?: string
      runId?: string
      usage?: { input: number; output: number }
    }
  | {
      event: 'error'
      message: string
      ideaId?: string
      ideaName?: string
      runId?: string
      isFatal?: boolean
      action?: PipelineStageAction
      usage?: { input: number; output: number }
    }
  | {
      event: 'run_started'
      runId: string
      totalIdeas: number
      pipelineId?: string | null
      usage?: { input: number; output: number }
    }
  | {
      event: 'ideas_created'
      runId: string
      ideaIds: string[]
      usage?: { input: number; output: number }
    }
  | {
      event: 'idea_started'
      runId: string
      ideaId: string
      ideaName: string
      index: number
      total: number
      usage?: { input: number; output: number }
    }
  | {
      event: 'idea_completed'
      runId: string
      ideaId: string
      ideaName: string
      status: IdeaStatus
      index: number
      total: number
      usage?: { input: number; output: number }
    }
  | {
      event: 'run_completed'
      runId: string
      ideaIds: string[]
      status: 'completed'
      completed: number
      failed: number
      usage?: { input: number; output: number }
    }

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'system'

export type LogStage =
  | 'SYSTEM'
  | 'ENRICH'
  | 'GEN'
  | 'VALID'
  | 'FIX'
  | 'REPAIR'
  | 'INGEST'
  | 'DONE'
  | 'ERROR'

export interface LogEntry {
  id: string
  ts: string
  stage: LogStage
  level: LogLevel
  ideaName?: string
  message: string
  detail?: string
  input?: string
  output?: string
  attempt?: number
  action?: PipelineStageAction
  isFatal?: boolean
  usage?: { input: number; output: number }
}

export interface IdeaRunState {
  ideaId: string
  ideaName: string
  status: 'queued' | 'running' | 'done' | 'failed'
  progress: number
  startedAt?: number
  durationMs?: number
  attempt?: number
  action?: PipelineStageAction
  isFatal?: boolean
}

export interface RunSession {
  id: string
  startedAt: number
  ideas: IdeaRunState[]
  logs: LogEntry[]
  isRunning: boolean
  totalDone: number
  totalFailed: number
}

export type VisualizationStageKey = 'enrich' | 'generate' | 'validate' | 'repair'

export type VisualizationStageState = 'not_started' | 'running' | 'completed' | 'failed'

export type VisualizationContentFormat = 'text' | 'json' | 'code'

export interface VisualizationContentBlock {
  format: VisualizationContentFormat
  title: string
  content: string
}

export interface VisualizationIdeaSnapshot {
  id: string
  name: string
  type: string
  category: string
  tech: string[]
  complexity: string
  feel: string
  status: IdeaStatus
  enriched_spec?: EnrichedSpec
  generated_code?: string | null
  error_log?: string
}

export interface VisualizationStageTrace {
  stage: VisualizationStageKey
  state: VisualizationStageState
  input: VisualizationContentBlock
  output: VisualizationContentBlock
  idea: VisualizationIdeaSnapshot
  error?: string
  updatedAt?: string
}

export interface RunVisualizationStageResponse {
  ok: boolean
  stage: VisualizationStageKey
  state: VisualizationStageState
  input: VisualizationContentBlock
  output: VisualizationContentBlock
  idea: VisualizationIdeaSnapshot
  error?: string
}

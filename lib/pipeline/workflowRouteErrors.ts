const MIGRATION_PATH = 'supabase/migrations/006_pipeline_stages.sql'

type ErrorLike = {
  code?: string
  details?: string | null
  hint?: string | null
  message?: string
}

export const WORKFLOWS_SCHEMA_GUIDANCE =
  `The workflows schema is missing or out of date. Apply ${MIGRATION_PATH} and reload the app.`

export function serializeRouteError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === 'object' && error !== null) {
    return error
  }

  return { message: String(error) }
}

export function formatWorkflowRouteError(error: unknown, fallback: string) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error && typeof (error as ErrorLike).message === 'string'
      ? (error as ErrorLike).message!
      : error instanceof Error
        ? error.message
        : fallback

  if (isMissingWorkflowSchemaError(error)) {
    return `${WORKFLOWS_SCHEMA_GUIDANCE} Original error: ${message}`
  }

  return message || fallback
}

export function isMissingWorkflowSchemaError(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error && typeof (error as ErrorLike).message === 'string'
      ? (error as ErrorLike).message!
      : error instanceof Error
        ? error.message
        : String(error ?? '')

  return (
    /relation ["']?public\.(pipelines|pipeline_stages)["']? does not exist/i.test(message) ||
    /Could not find the table ['"]public\.(pipelines|pipeline_stages)['"] in the schema cache/i.test(message) ||
    /schema cache/i.test(message)
  )
}

/**
 * Utilities for handling known Supabase/PostgreSQL schema inconsistencies.
 */

/**
 * Detects if a database error is specifically about a missing column 
 * in the 'ideas' table. This can happen if the database is on an older schema.
 */
export function isMissingColumnError(message?: string): boolean {
  if (!message) return false
  
  // PostgreSQL error: "column ideas.X does not exist"
  const isPgError = /column\s+ideas\..+\s+does not exist/i.test(message)
  
  // PostgREST schema cache error: "Could not find the 'X' column of 'ideas' in the schema cache"
  const isSchemaCacheError = /Could not find the '.+' column of 'ideas' in the schema cache/i.test(message)
  
  return isPgError || isSchemaCacheError
}

/**
 * Returns the name of the missing column if the error message specifies it.
 */
export function getMissingColumnName(message?: string): string | null {
  if (!message) return null
  
  const pgMatch = /column\s+ideas\.(.+)\s+does not exist/i.exec(message)
  if (pgMatch?.[1]) return pgMatch[1]
  
  const cacheMatch = /Could not find the '(.+)' column of 'ideas'/i.exec(message)
  if (cacheMatch?.[1]) return cacheMatch[1]
  
  return null
}

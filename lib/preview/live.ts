export const LIVE_PREVIEW_STORAGE_PREFIX = 'veloxui:live-preview:'

export function getLivePreviewStorageKey(id: string) {
  return `${LIVE_PREVIEW_STORAGE_PREFIX}${id}`
}

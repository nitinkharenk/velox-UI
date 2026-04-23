interface QueueFilterShape {
  name?: string | null
  category?: string | null
  type?: string | null
  status?: string | null
}

interface QueueFilterOptions {
  query: string
  category: string
  type: string
  status?: string
}

export function filterQueueItems<T extends QueueFilterShape>(
  items: T[],
  options: QueueFilterOptions,
): T[] {
  const q = options.query.toLowerCase()

  return items.filter((item) => {
    const matchQ =
      !q ||
      (item.name ?? '').toLowerCase().includes(q) ||
      (item.category ?? '').toLowerCase().includes(q) ||
      (item.type ?? '').toLowerCase().includes(q)
    const matchC = options.category === 'all' || (item.category ?? '') === options.category
    const matchT = options.type === 'all' || (item.type ?? '') === options.type
    const matchS =
      options.status === undefined ||
      options.status === 'all' ||
      (item.status ?? '') === options.status

    return matchQ && matchC && matchT && matchS
  })
}

export function collectStringFacetValues<T, K extends keyof T>(items: T[], key: K): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item[key] as unknown)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ).sort() as string[]
}

export function paginateItems<T>(items: T[], currentPage: number, itemsPerPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
  const start = (currentPage - 1) * itemsPerPage

  return {
    totalPages,
    items: items.slice(start, start + itemsPerPage),
  }
}

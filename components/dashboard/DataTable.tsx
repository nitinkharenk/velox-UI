import { cx } from '@/components/ui/cx'

type Row = {
  id: string
  cells: React.ReactNode[]
}

interface DataTableProps {
  title: string
  subtitle?: string
  columns: string[]
  rows: Row[]
  className?: string
}

export function DataTable({ title, subtitle, columns, rows, className }: DataTableProps) {
  return (
    <article className={cx('surface-panel rounded-[1.8rem] p-5 sm:p-6', className)}>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[--text-primary]">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-[--text-secondary]">{subtitle}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-[--border-subtle] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[--text-tertiary]"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group border-b border-[--border-subtle]/80 transition-colors duration-200 hover:bg-[--bg-hover]"
              >
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`} className="px-3 py-3 text-sm text-[--text-secondary] first:font-medium first:text-[--text-primary]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

export default DataTable

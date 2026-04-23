'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Trash2, Package, ExternalLink, Filter, Eye } from 'lucide-react'
import DashboardPageFrame from '@/components/dashboard/DashboardPageFrame'
import { cx } from '@/components/ui/cx'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'
import Reveal from '@/components/ui/Reveal'
import { collectStringFacetValues, filterQueueItems, paginateItems } from '@/lib/pipeline/queueCollections'
import HoverPreview from '@/components/pipeline/HoverPreview'

interface Asset {
  id: string
  slug: string
  name: string
  category: string
  type: string
  complexity: string
  created_at: string
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function InventoryPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterType, setFilterType] = useState("all")
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Hover Preview State
  const [previewState, setPreviewState] = useState<{
    slug: string | null
    visible: boolean
    x: number
    y: number
  }>({ slug: null, visible: false, x: 0, y: 0 })

  const loadAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/inventory')
      const data = await res.json()
      if (data.assets) setAssets(data.assets as Asset[])
    } catch {
      toast.error('Failed to load inventory')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => { void loadAssets() }, 0)
    return () => window.clearTimeout(t)
  }, [loadAssets])

  async function handleDelete(id: string) {
    // Instant delete requested
    const res = await fetch('/api/pipeline/inventory', { method: 'DELETE', body: JSON.stringify({ id }) })
    if (res.ok) {
      toast.success('Asset deleted')
      await loadAssets()
    } else {
      toast.error('Failed to delete asset')
    }
  }

  const handlePreviewEnter = (e: React.MouseEvent, slug: string) => {
    setPreviewState({
      slug,
      visible: true,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handlePreviewLeave = () => {
    setPreviewState(prev => ({ ...prev, visible: false }))
  }

  const handlePreviewMove = (e: React.MouseEvent) => {
    if (!previewState.visible) return
    setPreviewState(prev => ({ ...prev, x: e.clientX, y: e.clientY }))
  }

  const filteredAssets = filterQueueItems(assets, {
    query: searchQuery,
    category: filterCategory,
    type: filterType,
  })

  const categories = collectStringFacetValues(assets, 'category')
  const types = collectStringFacetValues(assets, 'type')
  const { totalPages, items: paginatedAssets } = paginateItems(filteredAssets, currentPage, itemsPerPage)

  return (
    <DashboardPageFrame
      title="Published Components"
      description="Manage everything already shipped to the public-facing library while keeping search, deletion, and pagination behavior unchanged."
      className="pb-24"
    >
    <div className="w-full flex flex-col gap-6">
      <Reveal as="section" className="depth-card glass-panel flex flex-col overflow-hidden rounded-[2rem] min-h-[700px]">
        {/* Header */}
        <div className="px-8 py-8 flex flex-col gap-6 lg:flex-row lg:items-center justify-between border-b border-white/5 bg-gray-200/5 dark:bg-white/5">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl depth-card bg-blue-100/50 dark:bg-blue-900/20">
                <Package className="h-6 w-6 text-[#0465ED]" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[--text-primary] accent-text">Component Inventory</h1>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Manage published components globally available in the public library.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-80 lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full depth-card glass-panel rounded-xl pl-10 pr-4 py-2.5 text-sm text-[--text-primary] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0465ED]/20 transition-all font-medium"
              />
            </div>
            <Button 
              variant={showFilters ? 'accent' : 'secondary'} 
              onClick={() => setShowFilters(f => !f)} 
              className={`whitespace-nowrap px-5 h-[42px] rounded-xl font-bold uppercase tracking-widest text-[10px] ${showFilters ? 'bg-[#0465ED] text-white' : 'depth-card'}`}
            >
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-200/5 dark:bg-white/5 border-b border-white/5 px-8 py-5 flex flex-wrap gap-8 animate-fade-in">
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 font-bold">Category</label>
              <select value={filterCategory} onChange={e => {setFilterCategory(e.target.value); setCurrentPage(1)}} className="w-full depth-card glass-panel rounded-xl px-4 py-2 text-sm text-[--text-secondary] focus:outline-none focus:ring-2 focus:ring-[#0465ED]/20 capitalize font-semibold">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 font-bold">Type</label>
              <select value={filterType} onChange={e => {setFilterType(e.target.value); setCurrentPage(1)}} className="w-full depth-card glass-panel rounded-xl px-4 py-2 text-sm text-[--text-secondary] focus:outline-none focus:ring-2 focus:ring-[#0465ED]/20 capitalize font-semibold">
                <option value="all">All Types</option>
                {types.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end mb-1">
               <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-[#0465ED]" onClick={() => { setFilterCategory('all'); setFilterType('all'); setSearchQuery(''); setCurrentPage(1); }}>Reset Filters</Button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-x-auto min-h-[400px]">
          <table className="w-full min-w-[1000px] text-left whitespace-nowrap table-fixed border-collapse">
            <colgroup>
               <col className="w-[8%]" />
               <col className="w-[32%]" />
               <col className="w-[15%]" />
               <col className="w-[15%]" />
               <col className="w-[15%]" />
               <col className="w-[15%]" />
             </colgroup>
            <thead className="bg-gray-200/5 dark:bg-white/5 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 font-bold">
              <tr>
                <th className="px-8 py-5 border-b border-white/5">S.No.</th>
                <th className="px-8 py-5 border-b border-white/5">Asset Name</th>
                <th className="px-8 py-5 border-b border-white/5">Category</th>
                <th className="px-8 py-5 border-b border-white/5">Complexity</th>
                <th className="px-8 py-5 border-b border-white/5">Published On</th>
                <th className="px-8 py-5 border-b border-white/5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center">
                    <EmptyState icon={Package} title="Inventory Empty" desc="No published assets matching these parameters." />
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset, idx) => (
                  <tr key={asset.id} className="hover:bg-gray-200/50 dark:hover:bg-white/5 transition-all duration-300 group cursor-pointer">
                    <td className="px-8 py-6 font-mono text-[11px] text-gray-500 font-bold">
                      {((currentPage - 1) * itemsPerPage) + idx + 1}
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                         <div className="flex flex-col min-w-0">
                           <p className="font-bold text-[--text-primary] text-[15px] truncate accent-text">{asset.name || 'Untitled Asset'}</p>
                           <p className="text-[11px] font-mono font-bold text-gray-400 mt-1 opacity-60">/{asset.slug}</p>
                         </div>
                         <div 
                           onMouseEnter={(e) => handlePreviewEnter(e, asset.slug)}
                           onMouseLeave={handlePreviewLeave}
                           onMouseMove={handlePreviewMove}
                           className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-gray-600 hover:text-[--accent] hover:border-[--accent-border] hover:bg-[--accent-soft-10] transition-all cursor-help"
                           title="Peek Live Preview"
                         >
                           <Eye className="h-3.5 w-3.5" />
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1 text-[11px] font-mono font-bold tracking-widest uppercase">
                         <span className="text-[#0465ED] truncate capitalize">{asset.category}</span>
                         <span className="text-gray-400 dark:text-gray-500 truncate capitalize opacity-80">{asset.type}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cx('text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm', asset.complexity === 'high' ? 'bg-orange-100/50 dark:bg-orange-900/20 text-orange-600' : 'bg-blue-100/50 dark:bg-blue-900/20 text-[#0465ED]')}>
                        {asset.complexity || 'Medium'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-gray-500 font-mono text-[11px] font-bold truncate">
                      {formatDate(asset.created_at)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <button 
                          onClick={() => window.open(`/preview/${asset.slug}`, '_blank', 'noopener,noreferrer')} 
                          className="flex h-9 w-9 items-center justify-center rounded-xl depth-card text-gray-400 hover:text-[#0465ED] transition-colors" 
                          title="View Live Asset"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(asset.id)} 
                          className="flex h-9 w-9 items-center justify-center rounded-xl depth-card text-gray-400 hover:text-[#F93E39] transition-colors" 
                          title="Delete Asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredAssets.length > 0 && (
          <div className="px-8 py-5 flex flex-col sm:flex-row gap-6 items-center justify-between bg-gray-200/5 dark:bg-white/5 border-t border-white/5 text-sm mt-auto">
            <span className="text-gray-500 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredAssets.length)} / {filteredAssets.length} assets
            </span>
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-mono text-[10px] font-bold uppercase tracking-wider">Density:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="depth-card glass-panel text-[--text-primary] text-[10px] font-bold font-mono rounded-lg px-2 py-1 outline-none"
                >
                  {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-gray-500" onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1}>Prev</Button>
                <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-[#0465ED]" onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Reveal>

      {/* Hover Preview Portal */}
      <HoverPreview 
        slug={previewState.slug} 
        visible={previewState.visible} 
        x={previewState.x} 
        y={previewState.y} 
      />
    </div>
    </DashboardPageFrame>
  )
}

import { useState, useMemo } from 'react'
import { Search, ChevronRight, Droplets, Thermometer, AlertTriangle } from 'lucide-react'
import { formatRain, formatTmax, TERRAIN_LABELS } from '../utils'

export default function PanchayatListMobile({ panchayats, onSelectPanchayat, lang }) {
  const [search, setSearch] = useState('')
  const [selectedBlock, setSelectedBlock] = useState('All')

  const blocks = useMemo(() => {
    const set = new Set()
    panchayats.forEach(p => set.add(p.block_name))
    return ['All', ...Array.from(set)]
  }, [panchayats])

  const filtered = useMemo(() => {
    return panchayats.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.name_hi.includes(search) ||
        p.lgd_code.toString().includes(search)
      const matchBlock = selectedBlock === 'All' || p.block_name === selectedBlock
      return matchSearch && matchBlock
    })
  }, [panchayats, search, selectedBlock])

  return (
    <div className="space-y-3 pb-20 animate-slide-in">
      {/* Search Bar & Filter */}
      <div className="glass-card p-3 space-y-2 sticky top-0 z-10 backdrop-blur-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            className="input-field pl-9 pr-3 text-sm min-h-[44px]"
            placeholder={lang === 'hi' ? 'पंचायत या LGD कोड खोजें...' : 'Search Panchayat or LGD code...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Block Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {blocks.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBlock(b)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[36px] transition-all border ${
                selectedBlock === b
                  ? 'bg-brand-600/30 border-brand-500/50 text-brand-300'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-400'
              }`}
            >
              {b === 'All' ? (lang === 'hi' ? 'सभी ब्लॉक' : 'All Blocks') : b}
            </button>
          ))}
        </div>
      </div>

      {/* List count */}
      <div className="px-1 flex justify-between items-center text-xs text-slate-400">
        <span>
          {filtered.length} {lang === 'hi' ? 'पंचायतें मिलीं' : 'panchayats found'}
        </span>
        <span>{lang === 'hi' ? 'विवरण के लिए टैप करें' : 'Tap to inspect'}</span>
      </div>

      {/* Panchayat Cards List */}
      <div className="space-y-2">
        {filtered.map(p => {
          const name = lang === 'hi' ? p.name_hi : p.name
          const blockName = lang === 'hi' ? p.block_name_hi : p.block_name
          const hasAnomaly = p.anomaly?.anomaly_rain || p.anomaly?.anomaly_tmax

          return (
            <div
              key={p.panchayat_id}
              onClick={() => onSelectPanchayat(p)}
              className="glass-card p-3 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform cursor-pointer hover:border-brand-500/40 min-h-[64px]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white truncate">{name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    LGD {p.lgd_code}
                  </span>
                  {hasAnomaly && (
                    <span className="text-red-400 flex items-center gap-0.5 text-[10px] font-semibold bg-red-900/30 px-1.5 py-0.5 rounded border border-red-500/30">
                      <AlertTriangle className="w-3 h-3" />
                      {lang === 'hi' ? 'विसंगति' : 'Anomaly'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>{blockName}</span>
                  <span>·</span>
                  <span>{TERRAIN_LABELS[p.terrain] || p.terrain}</span>
                </div>
              </div>

              {/* Weather Stats Pill */}
              <div className="flex items-center gap-3 shrink-0 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/50">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-blue-300 flex items-center justify-end gap-1">
                    <Droplets className="w-3 h-3 text-blue-400" />
                    {formatRain(p.rain_mm)}
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-300 flex items-center justify-end gap-1 mt-0.5">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    {formatTmax(p.tmax_c)}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { X, Droplets, Thermometer, ChevronRight, AlertTriangle } from 'lucide-react'
import { formatRain, formatTmax, getConfidenceColor, TERRAIN_LABELS } from '../utils'

export default function MobileBottomSheet({ panchayat, onClose, onInspect, lang }) {
  if (!panchayat) return null

  const p = panchayat
  const name = lang === 'hi' ? p.name_hi : p.name
  const blockName = lang === 'hi' ? p.block_name_hi : p.block_name
  const confColorRain = getConfidenceColor(p.confidence_rain)
  const confColorTmax = getConfidenceColor(p.confidence_tmax)
  const hasAnomaly = p.anomaly?.anomaly_rain || p.anomaly?.anomaly_tmax

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Card */}
      <div className="relative pointer-events-auto bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-4 shadow-2xl space-y-3 animate-slide-up max-h-[80vh] overflow-y-auto pb-20">
        {/* Handle bar */}
        <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-2" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg text-white leading-tight">{name}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-brand-900/50 text-brand-300 border border-brand-500/30">
              LGD {p.lgd_code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {blockName} · {TERRAIN_LABELS[p.terrain] || p.terrain}
          </p>
        </div>

        {/* Forecast Quick Summary Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Rain */}
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{lang === 'hi' ? 'वर्षा' : 'Rainfall'}</span>
              <Droplets className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-300 font-mono">
              {formatRain(p.rain_mm)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
              <span>[{formatRain(p.rain_low_mm)} - {formatRain(p.rain_high_mm)}]</span>
              <span className="font-semibold" style={{ color: confColorRain }}>
                {p.confidence_rain}
              </span>
            </div>
          </div>

          {/* Tmax */}
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{lang === 'hi' ? 'तापमान' : 'Max Temp'}</span>
              <Thermometer className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 font-mono">
              {formatTmax(p.tmax_c)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
              <span>[{formatTmax(p.tmax_low_c)} - {formatTmax(p.tmax_high_c)}]</span>
              <span className="font-semibold" style={{ color: confColorTmax }}>
                {p.confidence_tmax}
              </span>
            </div>
          </div>
        </div>

        {/* Anomaly Badge if present */}
        {hasAnomaly && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              {lang === 'hi' ? 'मॉडल-पहचानी विसंगति' : 'Anomaly detected in downscaled values'}
            </span>
          </div>
        )}

        {/* Action Button to Open Full Inspector */}
        <button
          onClick={() => {
            onInspect(p)
            onClose()
          }}
          className="btn-primary w-full min-h-[48px] py-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl shadow-glow-sm"
        >
          <span>{lang === 'hi' ? 'पूरा विश्लेषण देखें' : 'View Full Panchayat Analysis'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

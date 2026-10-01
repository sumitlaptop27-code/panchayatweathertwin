import { AlertTriangle, Leaf, Droplets, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { formatRain, formatTmax, getConfidenceColor, TERRAIN_LABELS } from '../utils'

function CompareBar({ label, value, blockValue, unit, color }) {
  const diff = value - blockValue
  const pct = blockValue > 0 ? Math.abs(diff / blockValue) * 100 : 0
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full relative overflow-hidden">
        <div
          className="absolute h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, pct * 2 + 30)}%`,
            background: color,
            opacity: 0.8,
          }}
        />
      </div>
      <span className="text-xs font-mono font-semibold w-20 text-right" style={{ color }}>
        {unit === 'mm' ? formatRain(value) : formatTmax(value)}
      </span>
    </div>
  )
}

export default function PanchayatInspector({ panchayat, lang }) {
  if (!panchayat) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <div className="w-20 h-20 rounded-full bg-brand-600/10 border border-brand-500/20 flex items-center justify-center mb-4">
          <Leaf className="w-9 h-9 text-brand-400 opacity-70" />
        </div>
        <p className="text-slate-400 text-sm font-medium">
          {lang === 'hi' ? 'मानचित्र पर पंचायत चुनें' : 'Click a panchayat on the map'}
        </p>
        <p className="text-slate-500 text-xs mt-1">
          {lang === 'hi' ? 'विस्तृत पूर्वानुमान और विश्लेषण देखें' : 'View detailed forecast and analysis'}
        </p>
      </div>
    )
  }

  const p = panchayat
  const name = lang === 'hi' ? p.name_hi : p.name
  const blockName = lang === 'hi' ? p.block_name_hi : p.block_name
  const confColorRain = getConfidenceColor(p.confidence_rain)
  const confColorTmax = getConfidenceColor(p.confidence_tmax)
  const hasAnomaly = p.anomaly?.anomaly_rain || p.anomaly?.anomaly_tmax

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-white text-base leading-tight">
              {name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {blockName} · LGD {p.lgd_code}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300">
              {TERRAIN_LABELS[p.terrain] || p.terrain}
            </span>
          </div>
        </div>

        {/* Static fingerprint mini-grid */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: lang === 'hi' ? 'ऊँचाई' : 'Elevation', value: `${p.elevation_m}m` },
            { label: lang === 'hi' ? 'ढलान' : 'Slope', value: `${p.slope_deg}°` },
            { label: 'NDVI', value: p.ndvi.toFixed(2) },
            { label: lang === 'hi' ? 'जल दूरी' : 'Water', value: `${p.dist_water_km}km` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-2 bg-slate-800/60 rounded-lg">
              <div className="text-slate-400 text-xs">{label}</div>
              <div className="text-white font-semibold text-sm mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Downscaled Forecast */}
      <div className="glass-card p-4 space-y-4">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" />
          {lang === 'hi' ? 'डाउनस्केल्ड पूर्वानुमान' : 'Downscaled Forecast'}
        </h4>

        {/* Rain */}
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{lang === 'hi' ? 'वर्षा' : 'Rainfall'}</span>
            <span className="badge-info">{lang === 'hi' ? 'मिमी' : 'mm'}</span>
          </div>
          <div className="text-3xl font-bold text-blue-300">
            {formatRain(p.rain_mm)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            [{formatRain(p.rain_low_mm)} – {formatRain(p.rain_high_mm)}]
            <span
              className="ml-2 font-semibold"
              style={{ color: confColorRain }}
            >
              {lang === 'hi'
                ? p.confidence_rain === 'High' ? 'उच्च' : p.confidence_rain === 'Medium' ? 'मध्यम' : 'निम्न'
                : p.confidence_rain} {lang === 'hi' ? 'विश्वास' : 'Confidence'}
            </span>
          </div>
          {/* Confidence bar */}
          <div className="mt-2 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: p.confidence_rain === 'High' ? '85%' : p.confidence_rain === 'Medium' ? '55%' : '30%',
                background: confColorRain,
              }}
            />
          </div>
        </div>

        {/* Tmax */}
        <div className="bg-orange-900/20 border border-orange-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{lang === 'hi' ? 'अधिकतम तापमान' : 'Max Temperature'}</span>
            <span className="badge-warning">°C</span>
          </div>
          <div className="text-3xl font-bold text-amber-300">
            {formatTmax(p.tmax_c)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            [{formatTmax(p.tmax_low_c)} – {formatTmax(p.tmax_high_c)}]
            <span
              className="ml-2 font-semibold"
              style={{ color: confColorTmax }}
            >
              {p.confidence_tmax} {lang === 'hi' ? 'विश्वास' : 'Confidence'}
            </span>
          </div>
        </div>
      </div>

      {/* Anomaly Banner */}
      {hasAnomaly && (
        <div className="glass-card p-3 border-red-500/40 bg-red-900/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-400">
                {lang === 'hi' ? 'मॉडल-पहचानी विसंगति' : 'Model-detected anomaly'}
              </p>
              {p.anomaly?.anomaly_rain && (
                <p className="text-xs text-slate-300 mt-0.5">
                  {lang === 'hi' ? 'वर्षा z-score:' : 'Rain z-score:'} {p.anomaly.z_rain}
                </p>
              )}
              {p.anomaly?.anomaly_tmax && (
                <p className="text-xs text-slate-300">
                  {lang === 'hi' ? 'तापमान z-score:' : 'Tmax z-score:'} {p.anomaly.z_tmax}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Why is this different? */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-indigo-400" />
          {lang === 'hi' ? 'यह अलग क्यों है?' : 'Why is this different?'}
        </h4>
        <div className="space-y-2">
          {(p.rain_explanation || []).map((exp, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-blue-400 mt-0.5">🌧</span>
              <span>{exp}</span>
            </div>
          ))}
          {(p.tmax_explanation || []).map((exp, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-amber-400 mt-0.5">🌡</span>
              <span>{exp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Baseline Comparison */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-slate-200 mb-3">
          {lang === 'hi' ? 'बेसलाइन तुलना' : 'Baseline Comparison'}
        </h4>
        <div className="space-y-1">
          <CompareBar
            label={lang === 'hi' ? 'ब्लॉक-कॉपी' : 'Block-Copy'}
            value={p.baselines?.block_copy_rain_mm}
            blockValue={p.block_rain_mm}
            unit="mm"
            color="#64748b"
          />
          <CompareBar
            label="IDW"
            value={p.baselines?.idw_rain_mm}
            blockValue={p.block_rain_mm}
            unit="mm"
            color="#818cf8"
          />
          <CompareBar
            label={lang === 'hi' ? 'WT मॉडल' : 'WT Model'}
            value={p.rain_mm}
            blockValue={p.block_rain_mm}
            unit="mm"
            color="#3b82f6"
          />
        </div>

        <div className="border-t border-slate-700/50 mt-3 pt-3 space-y-1">
          <CompareBar
            label={lang === 'hi' ? 'ब्लॉक-कॉपी' : 'Block-Copy'}
            value={p.baselines?.block_copy_tmax_c}
            blockValue={p.block_tmax_c}
            unit="°C"
            color="#64748b"
          />
          <CompareBar
            label="IDW"
            value={p.baselines?.idw_tmax_c}
            blockValue={p.block_tmax_c}
            unit="°C"
            color="#818cf8"
          />
          <CompareBar
            label={lang === 'hi' ? 'WT मॉडल' : 'WT Model'}
            value={p.tmax_c}
            blockValue={p.block_tmax_c}
            unit="°C"
            color="#f59e0b"
          />
        </div>
      </div>
    </div>
  )
}

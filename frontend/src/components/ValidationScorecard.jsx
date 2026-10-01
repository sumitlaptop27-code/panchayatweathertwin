import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { fetchValidationScorecard } from '../api'

const METHOD_COLORS = {
  'WeatherTwin': '#6366f1',
  'Block-Copy': '#64748b',
  'IDW Interpolation': '#818cf8',
}

const TERRAIN_MAP = {
  'Hills (Kundam)': { icon: '🌲', color: '#10b981' },
  'Plains (Panagar)': { icon: '🌾', color: '#f59e0b' },
  'Riverine (Bargi)': { icon: '🌊', color: '#3b82f6' },
}

function MetricTable({ terrain, data, variable, lang }) {
  const methods = ['WeatherTwin', 'Block-Copy', 'IDW Interpolation']
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left py-1.5 text-slate-400 font-medium">
              {lang === 'hi' ? 'विधि' : 'Method'}
            </th>
            <th className="text-right py-1.5 text-slate-400 font-medium">MAE</th>
            <th className="text-right py-1.5 text-slate-400 font-medium">RMSE</th>
          </tr>
        </thead>
        <tbody>
          {methods.map(method => {
            const m = data[method]
            const isWT = method === 'WeatherTwin'
            return (
              <tr key={method} className="border-b border-slate-700/30 last:border-0">
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: METHOD_COLORS[method] }}
                    />
                    <span className={isWT ? 'text-indigo-300 font-semibold' : 'text-slate-300'}>
                      {method === 'WeatherTwin' ? (lang === 'hi' ? 'वेदर ट्विन' : 'WeatherTwin') : method}
                    </span>
                    {isWT && <span className="text-indigo-400 text-xs">★</span>}
                  </div>
                </td>
                <td className="text-right py-1.5 font-mono">
                  <span className={isWT ? 'text-indigo-300 font-bold' : 'text-slate-300'}>
                    {m?.mae != null ? m.mae.toFixed(2) : '—'}
                    {variable === 'rain' ? ' mm' : '°C'}
                  </span>
                </td>
                <td className="text-right py-1.5 font-mono">
                  <span className={isWT ? 'text-indigo-300 font-bold' : 'text-slate-300'}>
                    {m?.rmse != null ? m.rmse.toFixed(2) : '—'}
                    {variable === 'rain' ? ' mm' : '°C'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ValidationBarChart({ scorecard, variable, lang }) {
  const terrains = Object.keys(scorecard)
  const methods = ['WeatherTwin', 'Block-Copy', 'IDW Interpolation']

  const data = terrains.map(t => {
    const entry = { name: t.split('(')[0].trim() }
    methods.forEach(m => {
      const val = scorecard[t][variable]?.[m]?.mae
      entry[m] = val != null ? parseFloat(val.toFixed(2)) : 0
    })
    return entry
  })

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={3} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          label={{
            value: `MAE (${variable === 'rain' ? 'mm' : '°C'})`,
            angle: -90,
            position: 'insideLeft',
            fill: '#64748b',
            fontSize: 10,
          }}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }}
        />
        {methods.map(m => (
          <Bar key={m} dataKey={m} fill={METHOD_COLORS[m]} radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={METHOD_COLORS[m]} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function ValidationScorecard({ lang }) {
  const [scorecard, setScorecard] = useState(null)
  const [variable, setVariable] = useState('rain')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchValidationScorecard()
      .then(d => setScorecard(d.scorecard))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="text-slate-400 text-sm animate-pulse">
        {lang === 'hi' ? 'लोड हो रहा है...' : 'Loading scorecard...'}
      </div>
    </div>
  )

  if (error || !scorecard) return (
    <div className="text-red-400 text-sm text-center py-8">
      {lang === 'hi' ? 'डेटा लोड करने में त्रुटि' : 'Error loading scorecard'}
    </div>
  )

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'hi' ? 'सत्यापन स्कोरकार्ड' : 'Validation Scorecard'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'hi'
                ? 'WeatherTwin vs Block-Copy vs IDW इंटरपोलेशन'
                : 'WeatherTwin vs Block-Copy vs IDW Interpolation'}
            </p>
          </div>
          <div className="flex gap-1">
            {['rain', 'tmax'].map(v => (
              <button
                key={v}
                onClick={() => setVariable(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  variable === v
                    ? 'bg-brand-600/30 border-brand-500/40 text-brand-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {v === 'rain'
                  ? (lang === 'hi' ? '🌧 वर्षा' : '🌧 Rain')
                  : (lang === 'hi' ? '🌡 तापमान' : '🌡 Tmax')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer note */}
      <div className="glass-card p-3 border-amber-500/20 bg-amber-900/10">
        <p className="text-xs text-amber-300 leading-relaxed">
          ℹ{' '}
          {lang === 'hi'
            ? 'ईमानदार सत्यापन: यह स्कोरकार्ड सिंथेटिक "सत्य" मानों का उपयोग करता है जो भू-भाग भौतिकी पर आधारित हैं। वास्तविक मनुष्य निरीक्षण आवश्यक हैं।'
            : 'Honest validation: This scorecard uses synthetic "truth" values derived from terrain physics. Real station observations are required for production validation.'}
        </p>
      </div>

      {/* Bar Chart */}
      <div className="glass-card p-4">
        <h4 className="text-xs font-semibold text-slate-300 mb-3">
          {lang === 'hi' ? 'MAE तुलना – भू-भाग प्रकार अनुसार' : 'MAE Comparison by Terrain Type'}
        </h4>
        <ValidationBarChart scorecard={scorecard} variable={variable} lang={lang} />
      </div>

      {/* Per-terrain detail tables */}
      {Object.entries(scorecard).map(([terrain, data]) => {
        const info = TERRAIN_MAP[terrain] || { icon: '📍', color: '#64748b' }
        return (
          <div
            key={terrain}
            className="glass-card p-4"
            style={{ borderLeft: `3px solid ${info.color}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold text-white">
                  {info.icon} {lang === 'hi'
                    ? terrain.includes('Hills') ? 'पहाड़ी (कुंडम)'
                      : terrain.includes('Plains') ? 'मैदान (पनागर)'
                      : 'नदी तटीय (बरगी)'
                    : terrain}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  {data.n_panchayats} {lang === 'hi' ? 'पंचायतें' : 'panchayats'}
                </span>
              </div>
            </div>
            <MetricTable terrain={terrain} data={data[variable]} variable={variable} lang={lang} />
          </div>
        )
      })}
    </div>
  )
}

// Color scale utilities for map choropleth
export const RAIN_COLORS = [
  { threshold: 0,   color: '#1e3a5f' },
  { threshold: 5,   color: '#1d4ed8' },
  { threshold: 15,  color: '#2563eb' },
  { threshold: 25,  color: '#3b82f6' },
  { threshold: 40,  color: '#60a5fa' },
  { threshold: 60,  color: '#93c5fd' },
  { threshold: 80,  color: '#bfdbfe' },
]

export const TMAX_COLORS = [
  { threshold: 24, color: '#bfdbfe' },
  { threshold: 28, color: '#fef08a' },
  { threshold: 30, color: '#fde047' },
  { threshold: 32, color: '#fb923c' },
  { threshold: 34, color: '#f97316' },
  { threshold: 36, color: '#dc2626' },
  { threshold: 38, color: '#7f1d1d' },
]

export function getRainColor(mm) {
  const scale = RAIN_COLORS
  for (let i = scale.length - 1; i >= 0; i--) {
    if (mm >= scale[i].threshold) return scale[i].color
  }
  return scale[0].color
}

export function getTmaxColor(c) {
  const scale = TMAX_COLORS
  for (let i = scale.length - 1; i >= 0; i--) {
    if (c >= scale[i].threshold) return scale[i].color
  }
  return scale[0].color
}

export function getConfidenceColor(level) {
  if (level === 'High') return '#10b981'
  if (level === 'Medium') return '#f59e0b'
  return '#ef4444'
}

export function getSeverityColor(severity) {
  if (severity === 'alert') return '#ef4444'
  if (severity === 'warning') return '#f59e0b'
  return '#3b82f6'
}

export function formatRain(mm) {
  return `${Number(mm).toFixed(1)} mm`
}

export function formatTmax(c) {
  return `${Number(c).toFixed(1)}°C`
}

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const TERRAIN_LABELS = {
  hilly_forest: '🌲 Hilly Forest',
  flat_plains: '🌾 Flat Plains',
  riverine_reservoir: '🌊 Riverine',
}

export const TERRAIN_LABELS_HI = {
  hilly_forest: '🌲 पहाड़ी वन',
  flat_plains: '🌾 समतल मैदान',
  riverine_reservoir: '🌊 नदी तटीय',
}

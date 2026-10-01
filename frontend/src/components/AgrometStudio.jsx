import { useState, useEffect } from 'react'
import { CheckCircle, Edit3, Send, AlertCircle, Wheat, Leaf, ChevronDown, ChevronUp, Smartphone } from 'lucide-react'
import { approveAdvisory, editAdvisory, dispatchSMS } from '../api'
import { getSeverityColor } from '../utils'

function SeverityBadge({ severity }) {
  const classes = {
    alert: 'badge-danger',
    warning: 'badge-warning',
    advisory: 'badge-info',
  }
  return <span className={classes[severity] || 'badge-info'}>{severity?.toUpperCase()}</span>
}

function AdvisoryCard({ advisory, lang, onUpdate, isMobile }) {
  const [expanded, setExpanded] = useState(isMobile) // Auto-expand on mobile for immediate access
  const [editing, setEditing] = useState(false)
  const [editHi, setEditHi] = useState(advisory.sms_hi)
  const [editEn, setEditEn] = useState(advisory.sms_en)
  const [loading, setLoading] = useState(false)
  const [dispatched, setDispatched] = useState(false)

  const isApproved = advisory.status === 'APPROVED'
  const severityColor = getSeverityColor(advisory.severity)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const updated = await approveAdvisory(advisory.advisory_id)
      onUpdate(updated)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    setLoading(true)
    try {
      const updated = await editAdvisory(advisory.advisory_id, {
        sms_en: editEn,
        sms_hi: editHi,
      })
      onUpdate(updated)
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDispatch = async () => {
    setLoading(true)
    try {
      await dispatchSMS(advisory.advisory_id)
      setDispatched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="glass-card p-3 md:p-4 space-y-3 transition-all duration-300"
      style={{ borderLeft: `4px solid ${severityColor}` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {advisory.crop === 'Soybean'
              ? <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
              : <Wheat className="w-4 h-4 text-amber-400 shrink-0" />
            }
            <span className="text-sm font-bold text-white">
              {lang === 'hi' ? advisory.crop_hi : advisory.crop}
            </span>
            <span className="text-xs text-slate-400">
              · {lang === 'hi' ? advisory.growth_stage_hi : advisory.growth_stage}
            </span>
            <SeverityBadge severity={advisory.severity} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {advisory.block_name} ·{' '}
            {lang === 'hi'
              ? `🌧 ${advisory.rain_trigger_mm}mm | 🌡 ${advisory.tmax_trigger_c}°C`
              : `Rain: ${advisory.rain_trigger_mm}mm | Tmax: ${advisory.tmax_trigger_c}°C`
            }
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={isApproved ? 'badge-success' : 'badge-draft'}>
            {isApproved
              ? (lang === 'hi' ? 'अनुमोदित' : 'APPROVED')
              : (lang === 'hi' ? 'ड्राफ्ट' : 'DRAFT')
            }
          </span>
          <button
            className="text-xs text-slate-400 hover:text-slate-200 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Advisory text */}
      <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-slate-700 pl-3">
        {lang === 'hi' ? advisory.advice_hi : advisory.advice_en}
      </p>

      {/* Expanded section */}
      {expanded && (
        <div className="space-y-3 animate-slide-in border-t border-slate-700/50 pt-3">
          {/* Mobile Notification / SMS Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                {lang === 'hi' ? 'SMS पूर्वावलोकन (160 अक्षर सीमा)' : 'SMS Preview (160 char limit)'}
              </span>
              <span className={`text-xs font-mono font-bold ${editHi.length > 160 ? 'text-red-400' : 'text-emerald-400'}`}>
                {editHi.length}/160 chars
              </span>
            </div>

            {editing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Hindi SMS:</label>
                  <textarea
                    className="textarea-field text-xs font-hindi"
                    rows={3}
                    value={editHi}
                    onChange={e => setEditHi(e.target.value.slice(0, 160))}
                    placeholder="Hindi SMS text..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">English SMS:</label>
                  <textarea
                    className="textarea-field text-xs font-sans"
                    rows={2}
                    value={editEn}
                    onChange={e => setEditEn(e.target.value.slice(0, 160))}
                    placeholder="English SMS text..."
                  />
                </div>
              </div>
            ) : (
              /* Mobile Chat Bubble Styling */
              <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-700/60 shadow-inner relative overflow-hidden">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 pb-1 border-b border-slate-800">
                  <span className="font-semibold text-indigo-300">📱 Govt Agromet Alert</span>
                  <span>Just now</span>
                </div>
                <div className="text-xs text-slate-200 font-hindi leading-relaxed">
                  {editHi}
                </div>
                <div className="mt-2 text-[10px] text-right text-slate-500 font-mono">
                  {editHi.length}/160
                </div>
              </div>
            )}
          </div>

          {/* Action buttons (Min 44px touch targets) */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {editing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="btn-primary text-xs min-h-[44px] px-4"
                >
                  {lang === 'hi' ? 'सहेजें' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="btn-outline text-xs min-h-[44px] px-4"
                >
                  {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-outline text-xs min-h-[44px] px-3.5 flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  {lang === 'hi' ? 'संपादित करें' : 'Edit SMS'}
                </button>
                {!isApproved && (
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="btn-success text-xs min-h-[44px] px-4 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {lang === 'hi' ? 'अनुमोदित करें' : 'Approve'}
                  </button>
                )}
                {isApproved && !dispatched && (
                  <button
                    onClick={handleDispatch}
                    disabled={loading}
                    className="btn-primary text-xs min-h-[44px] px-4 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
                  >
                    <Send className="w-4 h-4" />
                    {lang === 'hi' ? 'SMS भेजें (~1200 किसान)' : 'Dispatch Hindi SMS (~1200)'}
                  </button>
                )}
                {dispatched && (
                  <span className="badge-success text-xs min-h-[44px] px-3 flex items-center">
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {lang === 'hi' ? '1200 किसानों को भेजा' : 'Sent to ~1200 farmers'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AgrometStudio({ advisories, lang, onAdvisoryUpdate, isMobile }) {
  const crops = ['Soybean', 'Wheat']
  const [cropFilter, setCropFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = advisories.filter(a => {
    const cropMatch = cropFilter === 'All' || a.crop === cropFilter
    const statusMatch = statusFilter === 'All' || a.status === statusFilter
    return cropMatch && statusMatch
  })

  return (
    <div className="space-y-4 pb-20 animate-slide-in">
      <div className="glass-card p-3 md:p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">
          {lang === 'hi' ? 'कृषि-मौसम अधिकारी स्टूडियो' : 'Agromet Officer Studio'}
        </h3>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {['All', ...crops].map(c => (
              <button
                key={c}
                onClick={() => setCropFilter(c)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] ${
                  cropFilter === c
                    ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                    : 'text-slate-400 hover:text-white border border-transparent hover:border-slate-700'
                }`}
              >
                {c === 'All' ? (lang === 'hi' ? 'सभी फसलें' : 'All Crops')
                  : c === 'Soybean' ? (lang === 'hi' ? 'सोयाबीन' : 'Soybean')
                  : (lang === 'hi' ? 'गेहूँ' : 'Wheat')}
              </button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {['All', 'DRAFT', 'APPROVED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] ${
                  statusFilter === s
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent hover:border-slate-700'
                }`}
              >
                {s === 'All' ? (lang === 'hi' ? 'सभी स्थिति' : 'All Status')
                  : s === 'DRAFT' ? (lang === 'hi' ? 'ड्राफ्ट' : 'Draft')
                  : (lang === 'hi' ? 'अनुमोदित' : 'Approved')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advisory count */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-slate-400">
          {filtered.length} {lang === 'hi' ? 'सलाह मिली' : 'advisories found'}
        </span>
        <span className="text-emerald-400 font-semibold">
          {advisories.filter(a => a.status === 'APPROVED').length} {lang === 'hi' ? 'अनुमोदित' : 'approved'}
        </span>
      </div>

      {/* Advisory cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm glass-card">
            {lang === 'hi' ? 'कोई सलाह नहीं मिली' : 'No advisories match the filter'}
          </div>
        ) : (
          filtered.map(adv => (
            <AdvisoryCard
              key={adv.advisory_id}
              advisory={adv}
              lang={lang}
              onUpdate={onAdvisoryUpdate}
              isMobile={isMobile}
            />
          ))
        )}
      </div>
    </div>
  )
}

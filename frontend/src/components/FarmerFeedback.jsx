import { useState } from 'react'
import { CloudRain, CheckCircle, XCircle, MessageSquare, RefreshCw } from 'lucide-react'
import { submitFeedback, fetchFeedbackLog } from '../api'

export default function FarmerFeedback({ panchayats, lang }) {
  const [selectedPanchayat, setSelectedPanchayat] = useState('')
  const [rained, setRained] = useState(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [log, setLog] = useState([])
  const [showLog, setShowLog] = useState(false)

  const loadLog = async () => {
    const data = await fetchFeedbackLog()
    setLog(data.entries || [])
    setShowLog(true)
  }

  const handleSubmit = async () => {
    if (!selectedPanchayat || rained === null) return
    setSubmitting(true)
    const p = panchayats.find(x => x.panchayat_id === selectedPanchayat)
    try {
      await submitFeedback({
        panchayat_id: selectedPanchayat,
        panchayat_name: p?.name || selectedPanchayat,
        rained,
        amount_mm: amount ? parseFloat(amount) : null,
        farmer_note: note,
        lat: p?.lat,
        lon: p?.lon,
      })
      setSubmitted(true)
      // Reset after 3s
      setTimeout(() => {
        setSubmitted(false)
        setRained(null)
        setAmount('')
        setNote('')
      }, 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 pb-20 animate-slide-in">
      {/* Header */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30 shrink-0">
            <CloudRain className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {lang === 'hi' ? 'किसान प्रतिक्रिया' : 'Farmer Ground Truth'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'hi' ? 'जमीनी सच्चाई लॉग दर्ज करें' : 'Submit field verification data'}
            </p>
          </div>
        </div>

        {/* Panchayat selector */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              {lang === 'hi' ? 'अपनी पंचायत चुनें' : 'Select your Panchayat'}
            </label>
            <select
              className="input-field text-sm font-medium min-h-[48px] bg-slate-900/90 text-white"
              value={selectedPanchayat}
              onChange={e => setSelectedPanchayat(e.target.value)}
            >
              <option value="">
                {lang === 'hi' ? '-- पंचायत चुनें --' : '-- Select Panchayat --'}
              </option>
              {panchayats.map(p => (
                <option key={p.panchayat_id} value={p.panchayat_id}>
                  {lang === 'hi' ? p.name_hi : p.name} ({p.block_name})
                </option>
              ))}
            </select>
          </div>

          {/* Rain question */}
          <div>
            <p className="text-sm font-bold text-white mb-2">
              {lang === 'hi'
                ? 'क्या आज आपके गाँव में बारिश हुई?'
                : 'Did it rain in your village today?'}
            </p>
            {/* Oversized High-Contrast Thumb-Friendly Buttons (Min 56px height) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRained(true)}
                className={`min-h-[56px] py-3.5 px-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all border-2 select-none active:scale-[0.98] ${
                  rained === true
                    ? 'bg-blue-600 border-blue-400 text-white shadow-glow'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-blue-500'
                }`}
              >
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <span>{lang === 'hi' ? 'हाँ / Yes' : 'Yes / हाँ'}</span>
              </button>
              <button
                type="button"
                onClick={() => setRained(false)}
                className={`min-h-[56px] py-3.5 px-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all border-2 select-none active:scale-[0.98] ${
                  rained === false
                    ? 'bg-slate-700 border-slate-500 text-white shadow-glow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <XCircle className="w-6 h-6 text-red-400" />
                <span>{lang === 'hi' ? 'नहीं / No' : 'No / नहीं'}</span>
              </button>
            </div>
          </div>

          {/* Amount (conditional) */}
          {rained === true && (
            <div className="animate-slide-in">
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                {lang === 'hi' ? 'अनुमानित वर्षा (मिमी, वैकल्पिक)' : 'Estimated Rain Amount (mm, optional)'}
              </label>
              <input
                type="number"
                min="0"
                max="500"
                className="input-field text-sm min-h-[48px]"
                placeholder="e.g. 12"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              {lang === 'hi' ? 'टिप्पणी (वैकल्पिक)' : 'Farmer Note (optional)'}
            </label>
            <input
              type="text"
              className="input-field text-sm min-h-[48px]"
              placeholder={lang === 'hi' ? 'जैसे: भारी बारिश, तेज हवाएँ...' : 'e.g. Hail storm, flash flooding...'}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {/* Submit */}
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-bold">
                {lang === 'hi' ? 'धन्यवाद! आपकी प्रतिक्रिया दर्ज की गई।' : 'Thank you! Field feedback recorded.'}
              </span>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!selectedPanchayat || rained === null || submitting}
              className="btn-primary w-full min-h-[52px] text-base font-bold flex items-center justify-center gap-2 rounded-2xl shadow-glow-sm disabled:opacity-40"
            >
              <MessageSquare className="w-5 h-5" />
              {lang === 'hi' ? 'प्रतिक्रिया जमा करें' : 'Submit Feedback'}
            </button>
          )}
        </div>
      </div>

      {/* Ground truth log */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-white">
            {lang === 'hi' ? 'जमीनी सच्चाई लॉग' : 'Ground Truth Ledger'}
          </h4>
          <button
            onClick={loadLog}
            className="btn-outline text-xs min-h-[36px] px-3 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {lang === 'hi' ? 'लोड करें' : 'Load Log'}
          </button>
        </div>

        {showLog && (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                {lang === 'hi' ? 'अभी तक कोई प्रतिक्रिया नहीं' : 'No feedback entries yet'}
              </p>
            ) : (
              log.slice().reverse().map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  <div>
                    <span className="text-xs font-bold text-slate-200">{entry.panchayat_name}</span>
                    {entry.amount_mm && (
                      <span className="text-xs font-mono text-blue-400 ml-2 font-bold">{entry.amount_mm}mm</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${entry.rained === 'Yes' ? 'text-blue-400' : 'text-slate-400'}`}>
                      {entry.rained === 'Yes' ? '🌧 Yes' : '☀ No'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(entry.timestamp).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

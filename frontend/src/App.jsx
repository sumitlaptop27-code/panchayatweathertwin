import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Globe2, CloudRain, Thermometer, RefreshCw, ChevronDown,
  Scale, CheckCircle, AlertCircle, Layers, Map, Zap, Shield, List, X
} from 'lucide-react'
import WeatherMap from './components/WeatherMap'
import PanchayatInspector from './components/PanchayatInspector'
import AgrometStudio from './components/AgrometStudio'
import FarmerFeedback from './components/FarmerFeedback'
import ValidationScorecard from './components/ValidationScorecard'
import PanchayatListMobile from './components/PanchayatListMobile'
import MobileBottomNav from './components/MobileBottomNav'
import MobileBottomSheet from './components/MobileBottomSheet'
import { fetchPanchayats, fetchAdvisories, fetchBlocks } from './api'
import { formatRain, formatTmax } from './utils'
import { useT } from './i18n'
import { useBreakpoint } from './hooks/useBreakpoint'

function ReconciliationBadge({ reconciliation, lang }) {
  if (!reconciliation) return null

  const blocks = Object.values(reconciliation)
  const allValid = blocks.every(b => b.reconciliation_valid)
  const totalBlockRain = blocks.reduce((s, b) => s + b.block_rain_mm, 0) / blocks.length
  const totalWeightedRain = blocks.reduce((s, b) => s + b.weighted_sum_rain_mm, 0) / blocks.length

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium transition-all ${
      allValid
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        : 'bg-red-500/10 border-red-500/30 text-red-300'
    }`}>
      {allValid
        ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
      }
      <span className="truncate">
        {lang === 'hi' ? 'ब्लॉक:' : 'Block:'} {formatRain(totalBlockRain)} |{' '}
        {lang === 'hi' ? 'भारित योग:' : 'Weighted:'} {formatRain(totalWeightedRain)}{' '}
        ({allValid ? (lang === 'hi' ? 'संतुलित ✓' : 'Balanced ✓') : (lang === 'hi' ? 'जाँचें ⚠' : 'Check ⚠')})
      </span>
    </div>
  )
}

function BlockCard({ block, isSelected, onSelect, lang }) {
  const rain = block.block_rain_mm
  return (
    <button
      onClick={() => onSelect(block.block_id)}
      className={`p-2.5 rounded-xl border text-left transition-all duration-200 min-h-[44px] shrink-0 ${
        isSelected
          ? 'bg-brand-600/20 border-brand-500/50 shadow-glow-sm'
          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
      }`}
    >
      <div className="text-xs font-semibold text-white">
        {lang === 'hi' ? block.block_name_hi : block.block_name}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5">
        {block.terrain === 'hilly_forest' ? '🌲' : block.terrain === 'flat_plains' ? '🌾' : '🌊'}
        {' '}{block.n_panchayats} {lang === 'hi' ? 'पंचायतें' : 'panchayats'}
      </div>
      <div className="flex gap-2.5 mt-1">
        <span className="text-blue-300 text-[11px] font-mono font-semibold">🌧 {formatRain(rain)}</span>
        <span className="text-amber-300 text-[11px] font-mono font-semibold">🌡 {formatTmax(block.block_tmax_c)}</span>
      </div>
    </button>
  )
}

function MetricCards({ data, lang }) {
  if (!data || data.length === 0) return null

  const avgRain = data.reduce((s, p) => s + (p.rain_mm || 0), 0) / data.length
  const maxRain = Math.max(...data.map(p => p.rain_mm || 0))
  const avgTmax = data.reduce((s, p) => s + (p.tmax_c || 0), 0) / data.length
  const anomaliesCount = data.filter(p => p.anomaly?.anomaly_rain || p.anomaly?.anomaly_tmax).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{lang === 'hi' ? 'औसत वर्षा' : 'Avg Rain'}</span>
          <span className="text-base">🌧</span>
        </div>
        <div className="text-lg font-bold text-blue-300 font-mono mt-1">
          {formatRain(avgRain)}
        </div>
      </div>
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{lang === 'hi' ? 'अधिकतम वर्षा' : 'Max Rain'}</span>
          <span className="text-base">📊</span>
        </div>
        <div className="text-lg font-bold text-blue-400 font-mono mt-1">
          {formatRain(maxRain)}
        </div>
      </div>
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{lang === 'hi' ? 'औसत तापमान' : 'Avg Tmax'}</span>
          <span className="text-base">🌡</span>
        </div>
        <div className="text-lg font-bold text-amber-300 font-mono mt-1">
          {formatTmax(avgTmax)}
        </div>
      </div>
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{lang === 'hi' ? 'विसंगतियाँ' : 'Anomalies'}</span>
          <span className="text-base">⚠️</span>
        </div>
        <div className="text-lg font-bold text-red-400 font-mono mt-1">
          {anomaliesCount}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [lang, setLang] = useState('en')
  const t = useT(lang)
  const { isMobile, isTablet, isDesktop } = useBreakpoint()

  const [panchayatData, setPanchayatData] = useState(null)
  const [geojson, setGeojson] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [advisories, setAdvisories] = useState([])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedPanchayat, setSelectedPanchayat] = useState(null)
  const [mobileBottomSheetPanchayat, setMobileBottomSheetPanchayat] = useState(null)
  
  // Tabs: 'map', 'inspector', 'studio', 'feedback', 'scorecard'
  const [activeTab, setActiveTab] = useState('map')
  const [variable, setVariable] = useState('rain')
  const [mapMode, setMapMode] = useState('twin')
  const [dayIndex, setDayIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (blockId, day) => {
    setRefreshing(true)
    try {
      const params = { day_index: day ?? dayIndex }
      if (blockId) params.block_id = blockId

      const [pData, gData, aData, bData] = await Promise.all([
        fetchPanchayats({ ...params }),
        fetchPanchayats({ ...params, format: 'geojson' }),
        fetchAdvisories(),
        fetchBlocks(),
      ])

      setPanchayatData(pData)
      setGeojson(gData)
      setAdvisories(aData.advisories || [])
      setBlocks(bData.blocks || [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dayIndex])

  useEffect(() => {
    loadData(null, 0)
  }, [])

  const handleBlockSelect = (blockId) => {
    setSelectedBlock(blockId === selectedBlock ? null : blockId)
    setSelectedPanchayat(null)
  }

  const handlePanchayatClick = (p) => {
    setSelectedPanchayat(p)
    if (isMobile) {
      setMobileBottomSheetPanchayat(p)
    } else {
      setActiveTab('inspector')
    }
  }

  const handleInspectFromMobileSheet = (p) => {
    setSelectedPanchayat(p)
    setActiveTab('inspector')
  }

  const handleDayChange = (idx) => {
    setDayIndex(idx)
    loadData(selectedBlock, idx)
  }

  const handleAdvisoryUpdate = (updated) => {
    setAdvisories(prev => prev.map(a => a.advisory_id === updated.advisory_id ? updated : a))
  }

  const allPanchayats = panchayatData?.panchayats || []
  const reconciliation = panchayatData?.reconciliation || null

  const DAYS = ['Today', 'D+1', 'D+2', 'D+3', 'D+4', 'D+5', 'D+6']

  return (
    <div className="min-h-screen bg-brand-gradient flex flex-col font-sans select-none md:select-auto overflow-x-hidden">
      {/* ── Global Header ── */}
      <header className="relative z-40 border-b border-slate-700/60 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-glow-indigo absolute inset-0 pointer-events-none" />

        {/* Disclaimer banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1 text-center">
          <p className="text-[11px] text-amber-300 font-medium leading-tight">
            {t('disclaimer')}
          </p>
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          {/* Logo + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient border border-brand-500/40 flex items-center justify-center shadow-glow-sm shrink-0">
              <Globe2 className="w-5 h-5 text-brand-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-xs md:text-sm leading-none truncate">
                {t('appTitle')}
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {t('sihCode')} · Jabalpur, MP
              </p>
            </div>
          </div>

          {/* Reconciliation Badge (Center / Desktop/Tablet) */}
          <div className="hidden sm:flex flex-1 justify-center max-w-md mx-2">
            <ReconciliationBadge reconciliation={reconciliation} lang={lang} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Day selector (Scrollable on small screens) */}
            <div className="flex gap-0.5 bg-slate-800/60 p-0.5 rounded-xl border border-slate-700/40 max-w-[200px] sm:max-w-none overflow-x-auto no-scrollbar">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => handleDayChange(i)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap min-h-[36px] ${
                    dayIndex === i
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadData(selectedBlock, dayIndex)}
              disabled={refreshing}
              className="btn-outline p-2 rounded-xl min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
              className="btn-outline px-2.5 py-1 text-xs font-bold min-h-[38px] flex items-center justify-center"
            >
              {lang === 'en' ? 'हिंदी' : 'EN'}
            </button>
          </div>
        </div>

        {/* Mobile Reconciliation Badge row */}
        <div className="sm:hidden px-3 pb-2 flex justify-center">
          <ReconciliationBadge reconciliation={reconciliation} lang={lang} />
        </div>
      </header>

      {/* ── Block Selector Bar (Horizontal Swipeable) ── */}
      <div className="border-b border-slate-700/40 bg-slate-900/60 backdrop-blur-xs px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <span className="text-xs text-slate-400 font-semibold shrink-0 mr-1">
            {lang === 'hi' ? 'ब्लॉक:' : 'Block:'}
          </span>
          {blocks.map(b => (
            <BlockCard
              key={b.block_id}
              block={b}
              isSelected={selectedBlock === b.block_id}
              onSelect={handleBlockSelect}
              lang={lang}
            />
          ))}
          {loading && (
            <div className="text-xs text-slate-500 animate-pulse shrink-0">
              {t('loading')}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="max-w-7xl mx-auto px-4 py-4 w-full flex-1 pb-20 lg:pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
          
          {/* Left Column: Map & Overview */}
          {/* Mobile: only show if activeTab === 'map' | Desktop: ALWAYS show (lg:flex lg:col-span-7) */}
          <div className={`w-full flex-col space-y-4 ${activeTab === 'map' ? 'flex' : 'hidden lg:flex'} lg:col-span-7`}>
            {/* Metric Cards row (Avg Rain, Max Rain, etc.) */}
            <MetricCards data={allPanchayats} lang={lang} />
            
            {/* Map Controls Floating Strip */}
            <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900/80 border border-slate-800 p-2 rounded-xl">
              <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
                <button
                  onClick={() => setMapMode('block')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mapMode === 'block' ? 'bg-blue-600 text-white shadow font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Layers className="w-3.5 h-3.5 inline mr-1" />
                  {lang === 'hi' ? 'IMD ब्लॉक' : 'IMD Block'}
                </button>
                <button
                  onClick={() => setMapMode('twin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mapMode === 'twin' ? 'bg-blue-600 text-white shadow font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Globe2 className="w-3.5 h-3.5 inline mr-1" />
                  WeatherTwin
                </button>
              </div>

              <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
                <button
                  onClick={() => setVariable('rain')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${variable === 'rain' ? 'bg-blue-600 text-white shadow font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <CloudRain className="w-3.5 h-3.5 inline mr-1" />
                  {lang === 'hi' ? 'वर्षा' : 'Rain'}
                </button>
                <button
                  onClick={() => setVariable('tmax')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${variable === 'tmax' ? 'bg-blue-600 text-white shadow font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Thermometer className="w-3.5 h-3.5 inline mr-1" />
                  Tmax
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400">
                  {allPanchayats.length} {lang === 'hi' ? 'पंचायतें' : 'panchayats'}
                </span>
                {mapMode === 'twin' && (
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] px-2 py-0.5 rounded-lg font-medium">WeatherTwin Active</span>
                )}
              </div>
            </div>

            {/* Map Card */}
            <div 
              className="w-full relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl bg-slate-900"
              style={{ height: '520px', minHeight: '520px' }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full bg-slate-900/50">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-xs">{t('loading')}</p>
                  </div>
                </div>
              ) : (
                <WeatherMap
                  geoJsonData={geojson}
                  geojsonData={geojson}
                  panchayatResults={allPanchayats}
                  onSelectPanchayat={handlePanchayatClick}
                  onPanchayatClick={handlePanchayatClick}
                  selectedBlock={selectedBlock}
                  selectedPanchayatId={selectedPanchayat?.panchayat_id}
                  selectedId={selectedPanchayat?.panchayat_id}
                  variable={variable}
                  selectedVariable={variable}
                  viewMode={mapMode}
                  mapMode={mapMode}
                  lang={lang}
                  isMobile={isMobile}
                />
              )}
            </div>
          </div>

          {/* Right Column: Tabbed Content (Inspector, Studio, Feedback, Scorecard) */}
          {/* Mobile: only show if activeTab !== 'map' | Desktop: ALWAYS show (lg:flex lg:col-span-5) */}
          <div className={`w-full flex-col space-y-4 ${activeTab !== 'map' ? 'flex' : 'hidden lg:flex'} lg:col-span-5`}>
            {/* Desktop Tab Selector Header */}
            <div className="hidden lg:flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex space-x-1 bg-slate-800/80 p-1 rounded-xl w-full justify-between">
                {[
                  { key: 'inspector', label: lang === 'hi' ? 'निरीक्षक' : 'Inspector' },
                  { key: 'studio', label: lang === 'hi' ? 'सलाह' : 'Studio' },
                  { key: 'feedback', label: lang === 'hi' ? 'प्रतिक्रिया' : 'Feedback' },
                  { key: 'scorecard', label: lang === 'hi' ? 'स्कोरकार्ड' : 'Scorecard' },
                ].map(({ key, label }) => {
                  const isActive = activeTab === key ||
                    (key === 'studio' && activeTab === 'advisory') ||
                    (key === 'scorecard' && activeTab === 'validation')
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all flex-1 text-center ${
                        isActive
                          ? 'bg-blue-600 text-white shadow font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mobile Header if on inspector */}
            {isMobile && activeTab === 'inspector' && (
              <div className="glass-card p-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {selectedPanchayat
                    ? (lang === 'hi' ? selectedPanchayat.name_hi : selectedPanchayat.name)
                    : (lang === 'hi' ? 'पंचायते एवं निरीक्षक' : 'Panchayats & Inspector')}
                </span>
                <button
                  onClick={() => setSelectedPanchayat(null)}
                  className="text-xs text-brand-400 font-semibold min-h-[36px] px-2 flex items-center gap-1"
                >
                  <List className="w-3.5 h-3.5" />
                  {lang === 'hi' ? 'सूची देखें' : 'View List'}
                </button>
              </div>
            )}

            {/* Tab Panels */}
            <div className="w-full bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
              {(activeTab === 'studio' || activeTab === 'advisory') && (
                <AgrometStudio
                  advisories={advisories}
                  lang={lang}
                  onAdvisoryUpdate={handleAdvisoryUpdate}
                  isMobile={isMobile}
                />
              )}
              {activeTab === 'inspector' && (
                isMobile && !selectedPanchayat ? (
                  <PanchayatListMobile
                    panchayats={allPanchayats}
                    onSelectPanchayat={(p) => setSelectedPanchayat(p)}
                    lang={lang}
                  />
                ) : (
                  <PanchayatInspector
                    panchayat={selectedPanchayat}
                    lang={lang}
                  />
                )
              )}
              {activeTab === 'feedback' && (
                <FarmerFeedback
                  panchayats={allPanchayats}
                  lang={lang}
                />
              )}
              {(activeTab === 'scorecard' || activeTab === 'validation') && (
                <ValidationScorecard
                  lang={lang}
                />
              )}
              {/* On desktop, if activeTab is 'map', default right pane to 'inspector' */}
              {activeTab === 'map' && (
                <div className="hidden lg:block">
                  <PanchayatInspector
                    panchayat={selectedPanchayat}
                    lang={lang}
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ── Mobile Slide-Up Bottom Sheet Drawer (Map polygon tap) ── */}
      {isMobile && (
        <MobileBottomSheet
          panchayat={mobileBottomSheetPanchayat}
          onClose={() => setMobileBottomSheetPanchayat(null)}
          onInspect={handleInspectFromMobileSheet}
          lang={lang}
        />
      )}

      {/* ── Persistent Mobile Bottom Navigation Bar (< 1024px) ── */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab)
          if (tab === 'inspector' && isMobile) {
            setSelectedPanchayat(null)
          }
        }}
        lang={lang}
      />
    </div>
  )
}

import { Map, List, Shield, CloudRain, Zap } from 'lucide-react'

export default function MobileBottomNav({ activeTab, setActiveTab, lang }) {
  const tabs = [
    { id: 'map', icon: Map, label: lang === 'hi' ? 'मानचित्र' : 'Map' },
    { id: 'inspector', icon: List, label: lang === 'hi' ? 'सूची' : 'Panchayats' },
    { id: 'studio', icon: Shield, label: lang === 'hi' ? 'सलाह' : 'Studio' },
    { id: 'feedback', icon: CloudRain, label: lang === 'hi' ? 'प्रतिक्रिया' : 'Feedback' },
    { id: 'scorecard', icon: Zap, label: lang === 'hi' ? 'स्कोरकार्ड' : 'Scorecard' },
  ]

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/60 px-2 py-1.5 flex items-center justify-around shadow-lg select-none"
      style={{ minHeight: '56px' }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id ||
          (tab.id === 'studio' && activeTab === 'advisory') ||
          (tab.id === 'scorecard' && activeTab === 'validation')
        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] ${
              isActive
                ? 'text-brand-400 bg-brand-600/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] leading-none tracking-tight">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// src/components/Profile/ProfileTabs.tsx

'use client'

interface ProfileTabsProps {
    activeTab: 'stats' | 'precision' | 'history' | 'achievements'
    onTabChange: (tab: 'stats' | 'precision' | 'history' | 'achievements') => void
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
    const tabs = [
        { id: 'stats', label: 'STATS' },
        { id: 'precision', label: 'PRECISION' },
        { id: 'history', label: 'HISTORY' },
        { id: 'achievements', label: 'ACHIEVEMENTS' }
    ] as const

    return (
        <div className="mb-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                flex-1 py-2 px-3 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
                                ${activeTab === tab.id
                                    ? tab.id === 'precision'
                                        ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                                        : 'bg-white/20 text-white'
                                    : 'text-white/60 hover:text-white/80'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
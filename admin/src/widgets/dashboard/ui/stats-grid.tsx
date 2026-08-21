import { useTranslation } from 'react-i18next'
import type { DashboardStats } from '@entities/access-grant/model/types'
import { Icon } from '@shared/ui/icon'

const cards = [
  { key: 'total', labelKey: 'stats.total', icon: 'users', tone: 'bg-slate-100 text-ink-700' },
  { key: 'active', labelKey: 'stats.active', icon: 'check', tone: 'bg-emerald-100 text-emerald-700' },
  { key: 'linked', labelKey: 'stats.linked', icon: 'link', tone: 'bg-blue-100 text-blue-700' },
  { key: 'subscribers', labelKey: 'stats.subscribers', icon: 'bot', tone: 'bg-orange-100 text-orange-700' },
] as const

export function StatsGrid({ stats, loading }: { stats?: DashboardStats; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <article key={card.key} className="animate-enter rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(16,29,26,0.045)]" style={{ animationDelay: `${index * 60}ms` }}>
          <div className="flex items-center justify-between">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${card.tone}`}><Icon name={card.icon} className="h-5 w-5" /></div>
            <span className="h-2 w-2 rounded-full bg-brand-500" />
          </div>
          <p className="mt-5 text-sm font-semibold text-ink-500">{t(card.labelKey)}</p>
          {loading ? <div className="mt-2 h-9 w-16 animate-pulse rounded bg-slate-100" /> : <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-ink-950">{stats?.[card.key] ?? 0}</p>}
        </article>
      ))}
    </div>
  )
}

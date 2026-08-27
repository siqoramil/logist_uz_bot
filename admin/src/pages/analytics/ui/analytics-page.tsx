import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccessAnalytics } from '@features/access-management'
import { apiErrorTranslationKey } from '@shared/api'
import { Icon, type IconName } from '@shared/ui'

interface MetricCard {
  label: string
  value: string
  icon: IconName
  tone: string
}

export function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const query = useAccessAnalytics()
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'ru-RU'
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const monthFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' }),
    [locale],
  )
  const money = (value: number) => `${numberFormat.format(value)} ${t('analytics.currency')}`

  if (query.isLoading) {
    return <div className="space-y-6"><div className="h-20 animate-pulse rounded-2xl bg-white" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-white" />)}</div><div className="h-80 animate-pulse rounded-3xl bg-white" /></div>
  }

  if (query.error || !query.data) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700" role="alert">{t(apiErrorTranslationKey(query.error))}</div>
  }

  const data = query.data
  const maxRevenue = Math.max(...data.months.map((month) => month.revenue), 1)
  const cards = [
    { label: t('analytics.currentMonth'), value: money(data.currentMonthRevenue), icon: 'wallet', tone: 'bg-emerald-100 text-emerald-700' },
    { label: t('analytics.recurring'), value: money(data.monthlyRecurringRevenue), icon: 'chart', tone: 'bg-blue-100 text-blue-700' },
    { label: t('analytics.activeSubscriptions'), value: numberFormat.format(data.activeSubscriptions), icon: 'users', tone: 'bg-violet-100 text-violet-700' },
    { label: t('analytics.totalRevenue'), value: money(data.totalRevenue), icon: 'check', tone: 'bg-amber-100 text-amber-700' },
  ] satisfies MetricCard[]

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t('analytics.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-ink-950 md:text-4xl">{t('analytics.title')}</h1>
        <p className="mt-2 text-sm text-ink-500">{t('analytics.description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(16,29,26,0.045)]">
            <div className={`grid h-11 w-11 place-items-center rounded-2xl ${card.tone}`}><Icon name={card.icon} className="h-5 w-5" /></div>
            <p className="mt-5 text-sm font-semibold text-ink-500">{card.label}</p>
            <p className="mt-1 text-2xl font-black tracking-[-0.035em] text-ink-950">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(16,29,26,0.045)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-black tracking-[-0.03em] text-ink-950">{t('analytics.chartTitle')}</h2><p className="mt-1 text-sm text-ink-500">{t('analytics.chartHint')}</p></div>
            <span className="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-extrabold text-brand-600">{money(data.pricePerMonth)} / {t('analytics.month')}</span>
          </div>
          <div className="mt-8 flex h-64 min-w-0 items-end gap-2 sm:gap-5">
            {data.months.map((month) => {
              const height = month.revenue === 0 ? 4 : Math.max(12, Math.round((month.revenue / maxRevenue) * 100))
              return (
                <div key={month.month} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
                  <p className="mb-2 truncate text-[11px] font-extrabold text-ink-700">{numberFormat.format(month.revenue)}</p>
                  <div className="flex h-[180px] items-end overflow-hidden rounded-xl bg-slate-50">
                    <div className={`w-full rounded-xl transition-all ${month.revenue === 0 ? 'bg-slate-200' : 'bg-brand-500'}`} style={{ height: `${height}%` }} />
                  </div>
                  <p className="mt-2 truncate text-[11px] font-bold capitalize text-ink-500">{monthFormat.format(new Date(`${month.month}-01T00:00:00Z`))}</p>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-3xl bg-ink-950 p-6 text-white shadow-[0_18px_50px_rgba(16,29,26,0.16)]">
            <Icon name="calendar" className="h-6 w-6 text-emerald-300" />
            <p className="mt-5 text-sm font-semibold text-white/55">{t('analytics.expiringSoon')}</p>
            <p className="mt-1 text-4xl font-black">{numberFormat.format(data.expiringSoon)}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">{t('analytics.expiringHint')}</p>
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6">
            <p className="text-sm font-semibold text-ink-500">{t('analytics.totalPayments')}</p>
            <p className="mt-1 text-3xl font-black text-ink-950">{numberFormat.format(data.totalPayments)}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

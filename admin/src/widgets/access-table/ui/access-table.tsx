import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessActions } from '@features/access-management/ui/access-actions'
import { useAccessGrants } from '@features/access-management/api/access-queries'
import { Icon } from '@shared/ui/icon'

export function AccessTable() {
  const { t, i18n } = useTranslation()
  const query = useAccessGrants()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage === 'en' ? 'en-GB' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [i18n.resolvedLanguage],
  )

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (query.data?.grants ?? []).filter((grant) => {
      const matchesStatus = filter === 'all' || (filter === 'active' ? grant.enabled : !grant.enabled)
      const matchesSearch = !needle || grant.username.includes(needle) || grant.phone.includes(needle) || String(grant.linkedUserId ?? '').includes(needle)
      return matchesStatus && matchesSearch
    })
  }, [filter, query.data, search])

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(16,29,26,0.045)]">
      <header className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-[-0.03em] text-ink-950">{t('table.title')}</h2>
          <p className="mt-1 text-sm text-ink-500">{t('table.description')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-brand-500 sm:w-64" placeholder={t('table.search')} />
          </label>
          <select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | 'active' | 'blocked')} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500">
            <option value="all">{t('common.all')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="blocked">{t('common.blocked')}</option>
          </select>
          <button onClick={() => query.refetch()} title={t('common.refresh')} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-ink-500 transition hover:bg-slate-50"><Icon name="refresh" className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      {query.error ? (
        <div className="m-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{t('errors.request')}</div>
      ) : query.isLoading ? (
        <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-50" />)}</div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center px-5 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600"><Icon name="users" className="h-6 w-6" /></div>
          <p className="mt-4 font-extrabold text-ink-950">{t('table.emptyTitle')}</p>
          <p className="mt-1 text-sm text-ink-500">{t('table.emptyHint')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead><tr className="bg-slate-50/80 text-xs font-bold uppercase tracking-[0.08em] text-ink-500"><th className="px-5 py-3">{t('table.username')}</th><th className="px-5 py-3">{t('table.phone')}</th><th className="px-5 py-3">{t('table.verification')}</th><th className="px-5 py-3">{t('table.status')}</th><th className="px-5 py-3">{t('table.created')}</th><th className="px-5 py-3 text-right">{t('table.actions')}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((grant) => (
                <tr key={grant.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon name="at" className="h-4 w-4" /></div><div><p className="font-extrabold text-ink-950">@{grant.username}</p><p className="text-xs text-ink-500">ID: {grant.id.slice(-6).toUpperCase()}</p></div></div></td>
                  <td className="px-5 py-4"><p className="text-sm font-bold text-ink-700">+{grant.phone}</p></td>
                  <td className="px-5 py-4">{grant.linkedUserId ? <div><p className="text-sm font-bold text-emerald-700">{t('table.verified')}</p><p className="text-xs text-ink-500">{t('table.telegramId', { id: grant.linkedUserId })}</p></div> : <span className="text-sm text-ink-500">{t('table.waiting')}</span>}</td>
                  <td className="px-5 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${grant.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${grant.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />{grant.enabled ? t('table.active') : t('table.blocked')}</span></td>
                  <td className="px-5 py-4 text-sm text-ink-500">{dateFormat.format(new Date(grant.createdAt))}</td>
                  <td className="px-5 py-4"><AccessActions grant={grant} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

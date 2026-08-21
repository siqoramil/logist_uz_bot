import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@entities/session/model/session-store'
import { useDashboardStats } from '@features/access-management/api/access-queries'
import { AddAccessForm } from '@features/access-management/ui/add-access-form'
import { AccessTable } from '@widgets/access-table/ui/access-table'
import { StatsGrid } from '@widgets/dashboard/ui/stats-grid'
import { Icon } from '@shared/ui/icon'
import { LanguageSwitcher } from '@shared/ui/language-switcher'

export function DashboardPage() {
  const { t } = useTranslation()
  const username = useSessionStore((state) => state.username)
  const logout = useSessionStore((state) => state.logout)
  const queryClient = useQueryClient()
  const stats = useDashboardStats()

  const signOut = () => {
    queryClient.clear()
    logout()
  }

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen border-r border-white/10 bg-ink-950 p-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-3 px-2 py-2"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 font-black">LB</div><div><p className="font-extrabold tracking-[-0.03em]">Logistic Bot</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">CRM platform</p></div></div>
        <nav className="mt-10"><p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{t('dashboard.nav')}</p><div className="mt-3 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-bold"><Icon name="users" className="h-5 w-5 text-emerald-300" />{t('dashboard.users')}</div></nav>
        <div className="mt-auto space-y-3"><LanguageSwitcher dark /><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-white/45">{t('dashboard.systemStatus')}</p><p className="mt-2 flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />{t('dashboard.online')}</p></div></div>
      </aside>

      <main className="min-w-0">
        <header className="flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/75 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-sm font-black text-white">LB</div><span className="font-extrabold">Logistic CRM</span></div>
          <div className="hidden lg:block"><p className="text-sm font-bold text-ink-500">{t('dashboard.adminPanel')}</p><p className="text-xs text-ink-500">{t('dashboard.adminHint')}</p></div>
          <div className="flex items-center gap-2"><div className="lg:hidden"><LanguageSwitcher /></div><div className="hidden text-right sm:block"><p className="text-sm font-extrabold text-ink-950">{username}</p><p className="text-xs text-ink-500">{t('dashboard.administrator')}</p></div><button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-ink-500 transition hover:border-red-200 hover:text-red-600" title={t('common.logout')}><Icon name="logout" className="h-4 w-4" /></button></div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 md:p-8">
          <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t('dashboard.eyebrow')}</p><h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-ink-950 md:text-4xl">{t('dashboard.title')}</h1><p className="mt-2 text-sm text-ink-500">{t('dashboard.description')}</p></div>
          <StatsGrid stats={stats.data} loading={stats.isLoading} />
          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <AccessTable />
            <div className="xl:sticky xl:top-6"><AddAccessForm /><div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-sm font-extrabold text-amber-900">{t('help.title')}</p><p className="mt-1 text-xs leading-5 text-amber-800/75">{t('help.text')}</p></div></div>
          </div>
        </div>
      </main>
    </div>
  )
}

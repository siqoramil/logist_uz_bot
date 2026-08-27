import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@entities/session'
import { AddAccessForm, useDashboardStats } from '@features/access-management'
import { AnalyticsPage } from '@pages/analytics'
import { ProfilePage } from '@pages/profile'
import { Icon, LanguageSwitcher } from '@shared/ui'
import { apiErrorTranslationKey } from '@shared/api'
import { AccessTable } from '@widgets/access-table'
import { StatsGrid } from '@widgets/dashboard'

type DashboardView = 'users' | 'analytics' | 'profile'

export function DashboardPage() {
  const { t } = useTranslation()
  const username = useSessionStore((state) => state.username)
  const logout = useSessionStore((state) => state.logout)
  const queryClient = useQueryClient()
  const stats = useDashboardStats()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [activePage, setActivePage] = useState<DashboardView>('users')

  useEffect(() => {
    if (!addModalOpen) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAddModalOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [addModalOpen])

  const signOut = () => {
    queryClient.clear()
    logout()
  }

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen border-r border-white/10 bg-ink-950 p-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-3 px-2 py-2"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 font-black">LB</div><div><p className="font-extrabold tracking-[-0.03em]">Logistic Bot</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">CRM platform</p></div></div>
        <nav className="mt-10"><p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{t('dashboard.nav')}</p><div className="mt-3 space-y-1.5"><button type="button" onClick={() => setActivePage('users')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${activePage === 'users' ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}><Icon name="users" className="h-5 w-5 text-emerald-300" />{t('dashboard.users')}</button><button type="button" onClick={() => setActivePage('analytics')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${activePage === 'analytics' ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}><Icon name="chart" className="h-5 w-5 text-emerald-300" />{t('dashboard.analytics')}</button><button type="button" onClick={() => setActivePage('profile')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${activePage === 'profile' ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}><Icon name="user" className="h-5 w-5 text-emerald-300" />{t('dashboard.profile')}</button></div></nav>
        <div className="mt-auto space-y-3"><LanguageSwitcher dark /><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-white/45">{t('dashboard.systemStatus')}</p><p className="mt-2 flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />{t('dashboard.online')}</p></div></div>
      </aside>

      <main className="min-w-0">
        <header className="flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/75 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-sm font-black text-white">LB</div><span className="font-extrabold">Logistic CRM</span></div>
          <div className="hidden lg:block"><p className="text-sm font-bold text-ink-500">{t('dashboard.adminPanel')}</p><p className="text-xs text-ink-500">{t('dashboard.adminHint')}</p></div>
          <div className="flex items-center gap-2"><div className="lg:hidden"><LanguageSwitcher /></div><div className="hidden text-right sm:block"><p className="text-sm font-extrabold text-ink-950">{username}</p><p className="text-xs text-ink-500">{t('dashboard.administrator')}</p></div><button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-ink-500 transition hover:border-red-200 hover:text-red-600" title={t('common.logout')}><Icon name="logout" className="h-4 w-4" /></button></div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 md:p-8">
          <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 lg:hidden"><button type="button" onClick={() => setActivePage('users')} className={`rounded-lg px-3 py-2 text-sm font-bold ${activePage === 'users' ? 'bg-ink-950 text-white' : 'text-ink-500'}`}>{t('dashboard.users')}</button><button type="button" onClick={() => setActivePage('analytics')} className={`rounded-lg px-3 py-2 text-sm font-bold ${activePage === 'analytics' ? 'bg-ink-950 text-white' : 'text-ink-500'}`}>{t('dashboard.analytics')}</button><button type="button" onClick={() => setActivePage('profile')} className={`rounded-lg px-3 py-2 text-sm font-bold ${activePage === 'profile' ? 'bg-ink-950 text-white' : 'text-ink-500'}`}>{t('dashboard.profile')}</button></div>
          {activePage === 'users' ? <><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t('dashboard.eyebrow')}</p><h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-ink-950 md:text-4xl">{t('dashboard.title')}</h1><p className="mt-2 text-sm text-ink-500">{t('dashboard.description')}</p></div>{stats.error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{t(apiErrorTranslationKey(stats.error))}</div>}<StatsGrid stats={stats.data} loading={stats.isLoading} /><div className="mt-6"><AccessTable /></div></> : activePage === 'analytics' ? <AnalyticsPage /> : <ProfilePage />}
        </div>
      </main>

      {activePage === 'users' && <button type="button" onClick={() => setAddModalOpen(true)} className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-[0_14px_35px_rgba(12,124,91,0.35)] transition hover:-translate-y-1 hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 sm:bottom-7 sm:right-7" aria-label={t('form.title')} title={t('form.title')}>
        <Icon name="plus" className="h-6 w-6" />
      </button>}

      {addModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/55 p-4 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddModalOpen(false) }}>
          <div className="animate-enter w-full max-w-[440px]">
            <AddAccessForm onClose={() => setAddModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

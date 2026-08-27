import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@entities/session'
import { Icon, LanguageSwitcher } from '@shared/ui'
import { apiErrorTranslationKey } from '@shared/api'
import { useAuthenticate } from '../api/auth-queries'

export function LoginForm() {
  const { t } = useTranslation()
  const login = useSessionStore((state) => state.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const authenticate = useAuthenticate()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await authenticate.mutateAsync({ username, password })
      login(username, password)
    } catch { /* Error is rendered from the typed mutation state. */ }
  }

  return (
    <main className="grid-texture relative grid min-h-screen place-items-center overflow-hidden bg-canvas p-5">
      <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-brand-100 blur-3xl" />
      <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-orange-100/70 blur-3xl" />
      <section className="animate-enter relative w-full max-w-[440px] rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_24px_80px_rgba(16,29,26,0.12)] backdrop-blur md:p-9">
        <div className="mb-9 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-950 text-lg font-black text-white">LB</div>
            <div>
              <p className="text-lg font-extrabold tracking-[-0.03em] text-ink-950">Logistic Bot</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{t('login.eyebrow')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-ink-950">{t('login.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">{t('login.description')}</p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink-700">{t('login.username')}</span>
            <input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" value={username} onChange={(event) => { setUsername(event.target.value); authenticate.reset() }} autoComplete="username" placeholder="admin" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink-700">{t('login.password')}</span>
            <span className="relative block">
              <input className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); authenticate.reset() }} autoComplete="current-password" placeholder="••••••••••••" required />
              <button type="button" className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100" onClick={() => setShowPassword((visible) => !visible)} aria-label={t(showPassword ? 'login.hidePassword' : 'login.showPassword')} aria-pressed={showPassword}>
                <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
              </button>
            </span>
          </label>
          {authenticate.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{t(apiErrorTranslationKey(authenticate.error))}</p>}
          <button className="h-12 w-full rounded-xl bg-ink-950 font-bold text-white shadow-lg shadow-ink-950/15 transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60" disabled={authenticate.isPending}>
            {authenticate.isPending ? t('login.loading') : t('login.submit')}
          </button>
        </form>
      </section>
    </main>
  )
}

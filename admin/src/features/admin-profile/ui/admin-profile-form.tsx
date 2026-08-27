import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@entities/session'
import { apiErrorTranslationKey } from '@shared/api'
import { Icon } from '@shared/ui'
import { useUpdateAdminProfile } from '../api/profile-queries'

export function AdminProfileForm() {
  const { t } = useTranslation()
  const currentUsername = useSessionStore((state) => state.username)
  const [username, setUsername] = useState(currentUsername)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saved, setSaved] = useState(false)
  const mutation = useUpdateAdminProfile()
  const passwordsMatch = newPassword === confirmation

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(false)
    if (!passwordsMatch) return
    mutation.mutate({ username, currentPassword, newPassword }, {
      onSuccess: () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmation('')
        setSaved(true)
      },
    })
  }

  const passwordType = showPasswords ? 'text' : 'password'

  return (
    <section className="max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(16,29,26,0.045)] md:p-8">
      <div className="mb-7 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600"><Icon name="user" className="h-6 w-6" /></div>
        <div><h2 className="text-xl font-black text-ink-950">{t('profile.credentialsTitle')}</h2><p className="mt-1 text-sm text-ink-500">{t('profile.credentialsHint')}</p></div>
      </div>
      <form className="space-y-5" onSubmit={submit}>
        <label className="block"><span className="mb-2 block text-sm font-bold text-ink-700">{t('profile.email')}</span><input type="email" value={username} onChange={(event) => { setUsername(event.target.value); mutation.reset(); setSaved(false) }} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="username" required /></label>
        <label className="block"><span className="mb-2 block text-sm font-bold text-ink-700">{t('profile.currentPassword')}</span><input type={passwordType} value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); mutation.reset(); setSaved(false) }} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="current-password" required /></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-bold text-ink-700">{t('profile.newPassword')}</span><input type={passwordType} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); mutation.reset(); setSaved(false) }} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="new-password" minLength={8} required /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold text-ink-700">{t('profile.confirmPassword')}</span><input type={passwordType} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); mutation.reset(); setSaved(false) }} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="new-password" minLength={8} required /></label>
        </div>
        <button type="button" onClick={() => setShowPasswords((shown) => !shown)} className="flex items-center gap-2 text-sm font-bold text-ink-500 hover:text-brand-600"><Icon name={showPasswords ? 'eyeOff' : 'eye'} className="h-4 w-4" />{showPasswords ? t('login.hidePassword') : t('login.showPassword')}</button>
        {!passwordsMatch && confirmation && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{t('profile.passwordMismatch')}</p>}
        {mutation.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{t(apiErrorTranslationKey(mutation.error))}</p>}
        {saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{t('profile.saved')}</p>}
        <button disabled={mutation.isPending || !passwordsMatch} className="h-12 rounded-xl bg-brand-600 px-6 font-extrabold text-white transition hover:bg-brand-500 disabled:opacity-50">{mutation.isPending ? t('profile.saving') : t('profile.save')}</button>
      </form>
    </section>
  )
}

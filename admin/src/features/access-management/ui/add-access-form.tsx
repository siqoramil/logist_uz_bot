import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@shared/ui'
import { apiErrorTranslationKey } from '@shared/api'
import { useAddAccess } from '../api/access-queries'

interface AddAccessFormProps {
  onClose: () => void
}

const formatUzPhone = (digits: string): string => {
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
  return parts.filter(Boolean).join(' ')
}

const localPhoneDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  return (digits.startsWith('998') ? digits.slice(3) : digits).slice(0, 9)
}

export function AddAccessForm({ onClose }: AddAccessFormProps) {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const mutation = useAddAccess()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({ fullName, username: username ? `@${username}` : null, phone: `+998${phone}` }, {
      onSuccess: () => {
        setFullName('')
        setUsername('')
        setPhone('')
        onClose()
      },
    })
  }

  return (
    <section className="w-full rounded-3xl bg-ink-950 p-6 text-white shadow-[0_24px_80px_rgba(16,29,26,0.35)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="add-access-title">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{t('form.eyebrow')}</p>
          <h2 id="add-access-title" className="mt-1 text-xl font-black tracking-[-0.03em]">{t('form.title')}</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/15" aria-label={t('common.close')}><Icon name="x" className="h-5 w-5" /></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70"><Icon name="user" className="h-4 w-4" />{t('form.fullName')}</span>
          <input value={fullName} onChange={(event) => setFullName(event.target.value.slice(0, 100))} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" placeholder={t('form.fullNamePlaceholder')} autoComplete="name" minLength={2} maxLength={100} autoFocus required />
        </label>
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70"><Icon name="at" className="h-4 w-4" />{t('form.username')}</span>
          <div className="flex h-12 items-center rounded-xl border border-white/10 bg-white/10 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-400/10">
            <span className="pl-4 text-white/75">@</span>
            <input value={username} onChange={(event) => setUsername(event.target.value.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32))} className="h-full min-w-0 flex-1 bg-transparent px-1 pr-4 text-white outline-none placeholder:text-white/35" placeholder={t('form.usernamePlaceholder')} minLength={5} maxLength={32} pattern="[A-Za-z0-9_]{5,32}" />
          </div>
        </label>
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70"><Icon name="phone" className="h-4 w-4" />{t('form.phone')}</span>
          <div className="flex h-12 items-center rounded-xl border border-white/10 bg-white/10 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-400/10">
            <span className="pl-4 text-white/75">+998</span>
            <input value={formatUzPhone(phone)} onChange={(event) => setPhone(localPhoneDigits(event.target.value))} className="h-full min-w-0 flex-1 bg-transparent px-2 pr-4 text-white outline-none placeholder:text-white/35" placeholder="99 123 11 22" inputMode="numeric" autoComplete="tel-national" pattern="\d{2} \d{3} \d{2} \d{2}" title="99 123 11 22" required />
          </div>
        </label>
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/55">{t('form.hint')}</p>
        {mutation.error && <p className="rounded-lg bg-red-400/15 px-3 py-2 text-xs font-semibold leading-5 text-red-200" role="alert">{t(apiErrorTranslationKey(mutation.error))}</p>}
        <button disabled={mutation.isPending} className="h-12 w-full rounded-xl bg-brand-500 font-extrabold text-white transition hover:bg-brand-600 disabled:opacity-50">
          {mutation.isPending ? t('form.loading') : t('form.submit')}
        </button>
      </form>
    </section>
  )
}

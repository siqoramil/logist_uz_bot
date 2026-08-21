import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAddAccess } from '@features/access-management/api/access-queries'
import { Icon } from '@shared/ui/icon'

export function AddAccessForm() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [success, setSuccess] = useState(false)
  const mutation = useAddAccess()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSuccess(false)
    mutation.mutate({ username, phone }, {
      onSuccess: () => {
        setUsername('')
        setPhone('')
        setSuccess(true)
      },
    })
  }

  return (
    <section className="rounded-3xl bg-ink-950 p-6 text-white shadow-[0_18px_50px_rgba(16,29,26,0.18)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{t('form.eyebrow')}</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">{t('form.title')}</h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Icon name="plus" className="h-5 w-5" /></div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70"><Icon name="at" className="h-4 w-4" />{t('form.username')}</span>
          <input value={username} onChange={(event) => { setUsername(event.target.value); setSuccess(false) }} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white outline-none placeholder:text-white/35 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" placeholder="@username" required />
        </label>
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/70"><Icon name="phone" className="h-4 w-4" />{t('form.phone')}</span>
          <input value={phone} onChange={(event) => { setPhone(event.target.value); setSuccess(false) }} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white outline-none placeholder:text-white/35 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" placeholder="+998 90 123 45 67" inputMode="tel" required />
        </label>
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/55">{t('form.hint')}</p>
        {mutation.error && <p className="rounded-lg bg-red-400/15 px-3 py-2 text-xs font-semibold text-red-200">{t('errors.request')}</p>}
        {success && <p className="rounded-lg bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-200">{t('form.success')}</p>}
        <button disabled={mutation.isPending} className="h-12 w-full rounded-xl bg-brand-500 font-extrabold text-white transition hover:bg-brand-600 disabled:opacity-50">
          {mutation.isPending ? t('form.loading') : t('form.submit')}
        </button>
      </form>
    </section>
  )
}

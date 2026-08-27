import { useTranslation } from 'react-i18next'

type Language = 'ru' | 'en'
const languages = ['ru', 'en'] as const satisfies readonly Language[]

interface LanguageSwitcherProps {
  dark?: boolean
}

export function LanguageSwitcher({ dark = false }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage === 'en' ? 'en' : 'ru'

  const select = (language: Language): void => {
    localStorage.setItem('crm-language', language)
    void i18n.changeLanguage(language)
  }

  return (
    <div className={`inline-flex rounded-lg p-1 ${dark ? 'bg-white/10' : 'border border-slate-200 bg-white'}`} aria-label="Language">
      {languages.map((language) => (
        <button key={language} type="button" onClick={() => select(language)} className={`rounded-md px-2.5 py-1 text-xs font-extrabold transition ${current === language ? (dark ? 'bg-white text-ink-950' : 'bg-ink-950 text-white') : (dark ? 'text-white/55 hover:text-white' : 'text-ink-500 hover:text-ink-950')}`}>
          {t(`language.${language}`)}
        </button>
      ))}
    </div>
  )
}

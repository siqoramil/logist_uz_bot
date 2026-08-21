import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@app/styles/index.css'
import '@shared/config/i18n'
import { QueryProvider } from '@app/providers/query-provider'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)

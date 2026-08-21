import { LoginForm } from '@features/auth/ui/login-form'
import { DashboardPage } from '@pages/dashboard/ui/dashboard-page'
import { useSessionStore } from '@entities/session/model/session-store'

function App() {
  const authenticated = useSessionStore((state) => state.authenticated)
  return authenticated ? <DashboardPage /> : <LoginForm />
}

export default App

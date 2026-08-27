import { LoginForm } from '@features/auth'
import { DashboardPage } from '@pages/dashboard'
import { useSessionStore } from '@entities/session'

function App() {
  const authenticated = useSessionStore((state) => state.authenticated)
  return authenticated ? <DashboardPage /> : <LoginForm />
}

export default App

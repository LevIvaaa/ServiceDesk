import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin, ConfigProvider } from 'antd'
import { useTranslation } from 'react-i18next'
import enUS from 'antd/locale/en_US'
import ukUA from 'antd/locale/uk_UA'
import { useAuthStore } from './store/authStore'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TicketsList from './pages/Tickets/TicketsList'
import TicketDetail from './pages/Tickets/TicketDetail'
import IncomingQueue from './pages/Tickets/IncomingQueue'
import UsersList from './pages/Users/UsersList'
import DepartmentsList from './pages/Departments/DepartmentsList'
import StationsList from './pages/Stations/StationsList'
import OperatorsList from './pages/Operators/OperatorsList'
import KnowledgeBase from './pages/KnowledgeBase/KnowledgeBase'
import Settings from './pages/Settings/Settings'
import LogAnalysis from './pages/LogAnalysis/LogAnalysis'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function DashboardRedirect() {
  const { user } = useAuthStore()
  
  // Redirect admins to users page instead of dashboard
  if (user?.is_admin) {
    return <Navigate to="/users" replace />
  }
  
  return <Dashboard />
}

function App() {
  const { checkAuth, isLoading } = useAuthStore()
  const { i18n } = useTranslation()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  const antdLocale = i18n.language === 'en' ? enUS : ukUA

  return (
    <ConfigProvider locale={antdLocale} key={i18n.language}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<DashboardRedirect />} />
                  <Route path="/tickets" element={<TicketsList />} />
                  <Route path="/tickets/queue" element={<IncomingQueue />} />
                  <Route path="/tickets/:id" element={<TicketDetail />} />
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/departments" element={<DepartmentsList />} />
                  <Route path="/stations" element={<StationsList />} />
                  <Route path="/operators" element={<OperatorsList />} />
                  <Route path="/knowledge" element={<KnowledgeBase />} />
                  <Route path="/log-analysis" element={<LogAnalysis />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </ConfigProvider>
  )
}

export default App

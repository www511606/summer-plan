import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/constants'
import AuthPage from './components/AuthPage'
import Layout from './components/Layout'
import PlanList from './components/PlanList'
import CreatePlan from './components/CreatePlan'
import StatsPage from './components/StatsPage'
import RewardsPage from './components/RewardsPage'
import SettingsPage from './components/SettingsPage'

function App() {
  const [authenticated, setAuthenticated] = useState(null)

  useEffect(() => {
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    setAuthenticated(!!session)
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={authenticated ? <Navigate to="/" /> : <AuthPage />}
        />

        <Route
          path="/"
          element={authenticated ? <Layout /> : <Navigate to="/auth" />}
        >
          <Route index element={<PlanList />} />
          <Route path="plan/create" element={<CreatePlan />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

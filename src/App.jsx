import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Habits from './pages/Habits'
import Profile from './pages/Profile'

export default function App() {
  const { session, loading, initialize } = useAuthStore()

  useEffect(() => { initialize() }, [])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 bg-violet-600 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

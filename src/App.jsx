import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import BottomNav from './components/BottomNav'
import CommandBar from './components/ui/CommandBar'
import QuickActions from './components/ui/QuickActions'
import SyncIndicator from './components/ui/SyncIndicator'
import { useDailyReset } from './hooks/useDailyReset'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Permitidos from './pages/Permitidos'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Checkin from './pages/Checkin'
import Chat from './pages/Chat'
import Workout from './pages/Workout'
import Breathe from './pages/Breathe'
import Walk from './pages/Walk'

export default function App() {
  const [commandOpen, setCommandOpen] = useState(false)

  // Daily reset: checks date change at midnight + on app resume
  useDailyReset()

  // Listen for Cmd+K event from CommandBar
  useEffect(() => {
    const handler = () => setCommandOpen(true)
    document.addEventListener('open-command-bar', handler)
    return () => document.removeEventListener('open-command-bar', handler)
  }, [])

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="max-w-lg mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/permitidos" element={<Permitidos />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/checkin" element={<Checkin />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/breathe" element={<Breathe />} />
            <Route path="/walk" element={<Walk />} />
          </Routes>
          <BottomNav />

          {/* Quick Actions Grid + FAB */}
          <QuickActions
            onOpenSpotlight={() => setCommandOpen(true)}
            onOpenDamage={() => {}}
          />

          {/* Global Command Bar */}
          <CommandBar isOpen={commandOpen} onClose={() => setCommandOpen(false)} />

          {/* Sync indicator */}
          <SyncIndicator />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

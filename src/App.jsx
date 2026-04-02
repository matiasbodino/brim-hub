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
import Activity from './pages/Activity'
import Permitidos from './pages/Permitidos'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Checkin from './pages/Checkin'
import Chat from './pages/Chat'
import Workout from './pages/Workout'
import Breathe from './pages/Breathe'
import Walk from './pages/Walk'
import BJJSession from './pages/BJJSession'
import Onboarding from './pages/Onboarding'

export default function App() {
  const [commandOpen, setCommandOpen] = useState(false)
  const [isOnboarded, setIsOnboarded] = useState(() => !!localStorage.getItem('brim_onboarded'))

  // Daily reset: checks date change at midnight + on app resume
  useDailyReset()

  // Listen for onboarding completion
  useEffect(() => {
    const handler = () => setIsOnboarded(true)
    window.addEventListener('onboarding-complete', handler)
    return () => window.removeEventListener('onboarding-complete', handler)
  }, [])

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
            <Route path="/" element={isOnboarded ? <Dashboard /> : <Onboarding />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/walk" element={<Walk />} />
            <Route path="/breathe" element={<Breathe />} />
            <Route path="/bjj-session" element={<BJJSession />} />
            <Route path="/checkin" element={<Checkin />} />
            <Route path="/permitidos" element={<Permitidos />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
          <BottomNav />

          {/* Global Command Bar */}
          <CommandBar isOpen={commandOpen} onClose={() => setCommandOpen(false)} />

          {/* Sync indicator */}
          <SyncIndicator />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

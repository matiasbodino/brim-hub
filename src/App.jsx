import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import BottomNav from './components/BottomNav'
import CommandBar from './components/ui/CommandBar'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Permitidos from './pages/Permitidos'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Checkin from './pages/Checkin'
import Chat from './pages/Chat'

export default function App() {
  const [commandOpen, setCommandOpen] = useState(false)

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
          </Routes>
          <BottomNav />

          {/* Floating Action Button */}
          <button
            onClick={() => setCommandOpen(true)}
            className="fixed bottom-20 right-4 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-400/30 flex items-center justify-center text-2xl font-light active:scale-90 transition-transform z-50"
          >
            +
          </button>

          {/* Global Command Bar */}
          <CommandBar isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

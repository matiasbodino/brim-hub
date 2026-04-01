import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Permitidos from './pages/Permitidos'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Checkin from './pages/Checkin'
import Chat from './pages/Chat'

export default function App() {
  return (
    <BrowserRouter>
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
      </div>
    </BrowserRouter>
  )
}

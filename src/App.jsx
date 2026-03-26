import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Habits from './pages/Habits'
import Profile from './pages/Profile'

export default function App() {
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

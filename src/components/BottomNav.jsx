import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/activity', label: 'Registrar', icon: '⚡' },
  { to: '/progress', label: 'Progreso', icon: '📈' },
  { to: '/profile', label: 'Perfil', icon: '👤' },
]

const HIDDEN_ROUTES = ['/checkin', '/workout', '/walk', '/bjj-session', '/breathe']

export default function BottomNav() {
  const location = useLocation()
  if (HIDDEN_ROUTES.includes(location.pathname)) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-[9px] font-bold uppercase tracking-wider transition ${
                isActive ? 'text-blue-400' : 'text-gray-600'
              }`
            }
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

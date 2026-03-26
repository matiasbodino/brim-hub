import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Hoy', icon: '🏠' },
  { to: '/habits', label: 'Hábitos', icon: '💪' },
  { to: '/permitidos', label: 'Permitidos', icon: '🎁' },
  { to: '/progress', label: 'Progreso', icon: '📈' },
  { to: '/profile', label: 'Perfil', icon: '👤' },
]

export default function BottomNav() {
  const location = useLocation()
  if (location.pathname === '/checkin') return null
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition ${
                isActive ? 'text-violet-600' : 'text-gray-400'
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

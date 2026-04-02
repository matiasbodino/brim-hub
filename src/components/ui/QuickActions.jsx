import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHabitStore } from '../../stores/habitStore'
import { hapticLight, hapticMedium } from '../../lib/haptics'

const ACTIONS = [
  { id: 'food', emoji: '🍽', label: 'Comida', action: 'navigate', to: '/habits', state: { tab: 'food' } },
  { id: 'water', emoji: '💧', label: 'Agua', action: 'water' },
  { id: 'mate', emoji: '🧉', label: 'Mate', action: 'mate' },
  { id: 'gym', emoji: '🏋️', label: 'Gym', action: 'gym' },
  { id: 'bjj', emoji: '🥋', label: 'BJJ', action: 'bjj' },
  { id: 'steps', emoji: '🚶', label: 'Pasos', action: 'navigate', to: '/habits' },
  { id: 'journal', emoji: '📝', label: 'Nota', action: 'scroll', target: 'journal' },
  { id: 'damage', emoji: '🍖', label: 'Me pasé', action: 'damage' },
  { id: 'spotlight', emoji: '⚡', label: 'Spotlight', action: 'spotlight' },
]

export default function QuickActions({ onOpenSpotlight, onOpenDamage }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleAction = async (action) => {
    hapticLight()
    setOpen(false)

    if (action.action === 'navigate') {
      navigate(action.to, { state: action.state })
    } else if (action.action === 'water') {
      await useHabitStore.getState().addWater(0.25, 2.5)
      hapticMedium()
    } else if (action.action === 'mate') {
      await useHabitStore.getState().addMate(1, 2.5)
      hapticMedium()
    } else if (action.action === 'gym') {
      await useHabitStore.getState().upsertHabit('gym', 1, 1)
      hapticMedium()
    } else if (action.action === 'bjj') {
      await useHabitStore.getState().upsertHabit('bjj', 1, 1)
      hapticMedium()
    } else if (action.action === 'damage') {
      if (onOpenDamage) onOpenDamage()
    } else if (action.action === 'spotlight') {
      if (onOpenSpotlight) onOpenSpotlight()
    }
  }

  return (
    <>
      {/* Overlay + Grid */}
      {open && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute bottom-24 left-0 right-0 px-6 max-w-lg mx-auto animate-slide-up">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-5 border border-white/40 shadow-2xl">
              <div className="grid grid-cols-3 gap-3">
                {ACTIONS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleAction(a)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:bg-slate-100 transition-all active:scale-95"
                  >
                    <span className="text-2xl">{a.emoji}</span>
                    <span className="text-[10px] font-bold text-slate-600">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB button — replaces the old + button */}
      <button
        onClick={() => { hapticLight(); setOpen(!open) }}
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl font-light z-[60] transition-all duration-300 ${
          open
            ? 'bg-slate-600 text-white rotate-45 shadow-slate-400/30'
            : 'bg-slate-900 text-white shadow-slate-400/30'
        }`}
      >
        +
      </button>
    </>
  )
}

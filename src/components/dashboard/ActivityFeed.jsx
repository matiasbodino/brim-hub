import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import { useFoodStore } from '../../stores/foodStore'

const MEAL_EMOJIS = { desayuno: '☕', almuerzo: '🍽', merienda: '🧉', cena: '🌙', snack: '🍎' }
const MEAL_LABELS = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda', cena: 'Cena', snack: 'Snack' }

export default function ActivityFeed({ todayLogs, todayHabits }) {
  const [selectedItem, setSelectedItem] = useState(null)
  const { deleteLog } = useFoodStore()

  // Build timeline from all sources
  const items = []

  // Food logs grouped by meal_type
  const mealGroups = {}
  todayLogs.forEach(log => {
    const type = log.meal_type || 'snack'
    if (!mealGroups[type]) mealGroups[type] = []
    mealGroups[type].push(log)
  })

  // Add meal groups
  const mealOrder = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']
  mealOrder.forEach(type => {
    if (!mealGroups[type]) return
    items.push({ type: 'meal_header', label: MEAL_LABELS[type] || type, key: 'mh-' + type })
    mealGroups[type].forEach(log => {
      items.push({
        type: 'food',
        emoji: MEAL_EMOJIS[log.meal_type] || '🍽',
        title: log.description,
        value: `${log.calories} kcal`,
        detail: log,
        key: 'food-' + log.id,
        time: log.logged_at ? new Date(log.logged_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      })
    })
  })

  // Water logs
  const waterVal = Number(todayHabits.water?.value || 0)
  if (waterVal > 0) {
    items.push({ type: 'habit', emoji: '💧', title: 'Agua', value: `${waterVal.toFixed(1)}L`, key: 'water' })
  }

  // Steps
  const stepsVal = Number(todayHabits.steps?.value || 0)
  if (stepsVal > 0) {
    items.push({ type: 'habit', emoji: '🚶', title: 'Pasos', value: `${stepsVal.toLocaleString()}`, key: 'steps' })
  }

  // Gym
  if (Number(todayHabits.gym?.value || 0) >= 1) {
    items.push({ type: 'activity', emoji: '🏋️', title: 'Gym', value: 'Completado', key: 'gym' })
  }

  // BJJ
  if (Number(todayHabits.bjj?.value || 0) >= 1) {
    const meta = todayHabits.bjj?.metadata
    items.push({ type: 'activity', emoji: '🥋', title: `BJJ ${meta?.tipo || ''}`, value: meta?.duracion ? `${meta.duracion}min` : 'Completado', key: 'bjj' })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 text-sm">No registraste nada todavía hoy.</p>
        <p className="text-[10px] text-blue-400 font-bold mt-1">Tocá Registrar para empezar 💪</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-0.5">
        {items.map(item => {
          if (item.type === 'meal_header') {
            return (
              <div key={item.key} className="flex items-center gap-2 pt-3 pb-1">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{item.label}</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
            )
          }

          return (
            <button
              key={item.key}
              onClick={() => item.type === 'food' ? setSelectedItem(item) : null}
              className="w-full flex items-center justify-between py-2 px-1 rounded-lg active:bg-white/5 transition text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm">{item.emoji}</span>
                <span className="text-xs text-gray-300 truncate">{item.title}</span>
              </div>
              <span className="text-xs text-gray-500 font-bold flex-shrink-0 ml-2">{item.value}</span>
            </button>
          )
        })}
      </div>

      {/* Food detail sheet */}
      <BottomSheet isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title || ''}>
        {selectedItem?.detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-lg font-black text-white">{selectedItem.detail.calories}</p><p className="text-[8px] text-gray-500">kcal</p></div>
              <div><p className="text-lg font-black text-blue-400">{selectedItem.detail.protein || 0}g</p><p className="text-[8px] text-gray-500">prot</p></div>
              <div><p className="text-lg font-black text-amber-400">{selectedItem.detail.carbs || 0}g</p><p className="text-[8px] text-gray-500">carb</p></div>
              <div><p className="text-lg font-black text-red-400">{selectedItem.detail.fat || 0}g</p><p className="text-[8px] text-gray-500">fat</p></div>
            </div>
            <div className="space-y-2">
              <button onClick={() => { deleteLog(selectedItem.detail.id); setSelectedItem(null) }}
                className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-3 rounded-xl text-sm font-bold active:scale-95 transition">
                🗑 Eliminar
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}

import { useEffect, useRef } from 'react'
import { useHabitStore } from '../stores/habitStore'
import { useFoodStore } from '../stores/foodStore'
import { usePointsStore } from '../stores/pointsStore'
import { useEnergyStore } from '../stores/energyStore'

// Pending queue for offline writes
const pendingQueue = JSON.parse(localStorage.getItem('brim_pending_sync') || '[]')

function savePendingQueue() {
  localStorage.setItem('brim_pending_sync', JSON.stringify(pendingQueue))
}

export function queueSync(action) {
  pendingQueue.push({ ...action, timestamp: Date.now() })
  savePendingQueue()
}

export function clearSynced(timestamp) {
  const idx = pendingQueue.findIndex(a => a.timestamp === timestamp)
  if (idx >= 0) pendingQueue.splice(idx, 1)
  savePendingQueue()
}

// ─── Hook: background rehydration + online sync ───

export function useSync() {
  const isOnline = useRef(navigator.onLine)
  const hasSynced = useRef(false)

  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true
      flushPendingQueue()
      rehydrateAll()
    }
    const handleOffline = () => { isOnline.current = false }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial rehydration from Supabase (background, non-blocking)
    if (navigator.onLine && !hasSynced.current) {
      hasSynced.current = true
      rehydrateAll()
      flushPendingQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
}

async function rehydrateAll() {
  // These run in parallel, updating local state from server
  // The UI already shows cached data from persist, so this is invisible
  try {
    await Promise.allSettled([
      useHabitStore.getState().fetchToday(),
      useFoodStore.getState().fetchToday(),
      usePointsStore.getState().fetchAll(),
      useEnergyStore.getState().fetchToday(),
    ])
  } catch { /* silent — cached data is fine */ }
}

async function flushPendingQueue() {
  if (pendingQueue.length === 0) return
  const queue = [...pendingQueue]
  for (const action of queue) {
    try {
      if (action.type === 'upsertHabit') {
        await useHabitStore.getState().upsertHabit(action.habitType, action.value, action.target, action.metadata)
      } else if (action.type === 'addFoodLog') {
        await useFoodStore.getState().addLog(action.log)
      } else if (action.type === 'saveEnergy') {
        await useEnergyStore.getState().saveEnergy(action.level)
      }
      clearSynced(action.timestamp)
    } catch {
      // Keep in queue for next attempt
      break
    }
  }
}

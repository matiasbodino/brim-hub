import { useEffect, useRef } from 'react'
import { useHabitStore } from '../stores/habitStore'
import { useFoodStore } from '../stores/foodStore'
import { useEnergyStore } from '../stores/energyStore'
import { usePlanStore } from '../stores/planStore'

// Checks if the date has changed since last render
// If so, resets all "today" stores to fetch fresh data
export function useDailyReset() {
  const lastDate = useRef(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    // Check every 60 seconds if the date changed (handles midnight rollover)
    const interval = setInterval(() => {
      const now = new Date().toISOString().slice(0, 10)
      if (now !== lastDate.current) {
        lastDate.current = now
        // New day — refetch everything
        useHabitStore.getState().fetchToday()
        useFoodStore.getState().fetchToday()
        useEnergyStore.getState().fetchToday()
        usePlanStore.getState().fetchTodayPlan()
      }
    }, 60000) // check every minute

    // Also check on visibility change (user opens app after midnight)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = new Date().toISOString().slice(0, 10)
        if (now !== lastDate.current) {
          lastDate.current = now
          useHabitStore.getState().fetchToday()
          useFoodStore.getState().fetchToday()
          useEnergyStore.getState().fetchToday()
          usePlanStore.getState().fetchTodayPlan()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])
}

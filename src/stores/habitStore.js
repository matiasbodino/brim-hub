import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useHabitStore = create((set, get) => ({
  todayHabits: {},
  loading: false,

  fetchToday: async () => {
    set({ loading: true })
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('date', today)
    const habits = {}
    ;(data || []).forEach(h => { habits[h.habit_type] = h })
    set({ todayHabits: habits, loading: false })
  },

  upsertHabit: async (type, value, target) => {
    const today = new Date().toISOString().slice(0, 10)
    const MATI_ID = 'c17e4105-4861-43c8-bf13-0d32f7818418'
    const { data, error } = await supabase
      .from('habit_logs')
      .upsert({
        user_id: MATI_ID,
        date: today,
        habit_type: type,
        value,
        target,
      }, { onConflict: 'user_id,date,habit_type' })
      .select()
      .single()
    if (error) throw error
    set({ todayHabits: { ...get().todayHabits, [type]: data } })
  },
}))

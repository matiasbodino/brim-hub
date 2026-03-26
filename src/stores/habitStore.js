import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

export const useHabitStore = create((set, get) => ({
  todayHabits: {},
  loading: false,

  fetchToday: async () => {
    set({ loading: true })
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('date', today)
    if (error) { set({ loading: false }); return }
    const habits = {}
    ;(data || []).forEach(h => { habits[h.habit_type] = h })
    set({ todayHabits: habits, loading: false })
  },

  upsertHabit: async (type, value, target, metadata = null) => {
    const today = new Date().toISOString().slice(0, 10)
    const row = {
      user_id: MATI_ID,
      date: today,
      habit_type: type,
      value,
      target,
    }
    if (metadata) row.metadata = metadata
    const { data, error } = await supabase
      .from('habit_logs')
      .upsert(row, { onConflict: 'user_id,date,habit_type' })
      .select()
      .single()
    if (error) throw error
    set({ todayHabits: { ...get().todayHabits, [type]: data } })
  },
}))

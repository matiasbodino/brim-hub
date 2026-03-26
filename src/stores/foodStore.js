import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useFoodStore = create((set, get) => ({
  todayLogs: [],
  loading: false,

  fetchToday: async () => {
    set({ loading: true })
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .gte('logged_at', today + 'T00:00:00')
      .lte('logged_at', today + 'T23:59:59')
      .order('logged_at', { ascending: true })
    set({ todayLogs: data || [], loading: false })
  },

  addLog: async (log) => {
    const { data, error } = await supabase
      .from('food_logs')
      .insert(log)
      .select()
      .single()
    if (error) throw error
    set({ todayLogs: [...get().todayLogs, data] })
    return data
  },

  confirmLog: async (id) => {
    await supabase.from('food_logs').update({ confirmed: true }).eq('id', id)
    set({
      todayLogs: get().todayLogs.map(l => l.id === id ? { ...l, confirmed: true } : l)
    })
  },

  getTodayMacros: () => {
    const logs = get().todayLogs.filter(l => l.confirmed)
    return {
      calories: logs.reduce((a, l) => a + (l.calories || 0), 0),
      protein: logs.reduce((a, l) => a + Number(l.protein || 0), 0),
      carbs: logs.reduce((a, l) => a + Number(l.carbs || 0), 0),
      fat: logs.reduce((a, l) => a + Number(l.fat || 0), 0),
    }
  },
}))

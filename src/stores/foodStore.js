import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

export const useFoodStore = create((set, get) => ({
  todayLogs: [],
  loading: false,

  fetchToday: async () => {
    set({ loading: true })
    const today = new Date().toISOString().slice(0, 10)
    // Use date range in local timezone (Argentina UTC-3)
    const start = new Date(today + 'T00:00:00-03:00').toISOString()
    const end = new Date(today + 'T23:59:59-03:00').toISOString()
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .gte('logged_at', start)
      .lte('logged_at', end)
      .order('logged_at', { ascending: true })
    if (error) { set({ loading: false }); return }
    set({ todayLogs: data || [], loading: false })
  },

  addLog: async (log) => {
    const { data, error } = await supabase
      .from('food_logs')
      .insert({ ...log, user_id: MATI_ID })
      .select()
      .single()
    if (error) throw error
    set({ todayLogs: [...get().todayLogs, data] })
    return data
  },

  confirmLog: async (id) => {
    const { error } = await supabase.from('food_logs').update({ confirmed: true }).eq('id', id)
    if (error) throw error
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

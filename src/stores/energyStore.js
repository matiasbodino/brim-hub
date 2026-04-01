import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

export const useEnergyStore = create((set) => ({
  todayEnergy: null,   // null | 1-5
  loading: false,

  fetchToday: async () => {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('daily_logs')
      .select('energy_level')
      .eq('user_id', MATI_ID)
      .eq('date', today)
      .maybeSingle()
    set({ todayEnergy: data?.energy_level ?? null })
  },

  saveEnergy: async (level) => {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('daily_logs')
      .upsert({
        user_id: MATI_ID,
        date: today,
        energy_level: level,
      }, { onConflict: 'user_id,date' })
    if (error) return
    set({ todayEnergy: level })
  },
}))

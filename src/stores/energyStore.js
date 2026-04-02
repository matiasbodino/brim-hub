import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'
import { notifySync } from '../components/ui/SyncIndicator'

export const useEnergyStore = create(
  persist(
    (set) => ({
      todayEnergy: null,
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
        // Optimistic update
        set({ todayEnergy: level })
        const today = new Date().toISOString().slice(0, 10)
        await supabase
          .from('daily_logs')
          .upsert({ user_id: MATI_ID, date: today, energy_level: level }, { onConflict: 'user_id,date' })
        notifySync()
      },
    }),
    {
      name: 'brim-energy',
      partialize: (state) => ({ todayEnergy: state.todayEnergy }),
    }
  )
)

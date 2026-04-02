import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { MATI_ID, WATER_UNITS } from '../lib/constants'

export const useHabitStore = create(
  persist(
    (set, get) => ({
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
        row.completion_type =
          Number(value) >= Number(target) ? 'full' :
          Number(value) > 0               ? 'partial' :
                                            'skip'

        // Optimistic update
        set({ todayHabits: { ...get().todayHabits, [type]: { ...row, id: get().todayHabits[type]?.id || 'local' } } })

        const { data, error } = await supabase
          .from('habit_logs')
          .upsert(row, { onConflict: 'user_id,date,habit_type' })
          .select()
          .single()
        if (error) throw error
        set({ todayHabits: { ...get().todayHabits, [type]: data } })
      },

      // Water helper — adds pure water
      addWater: async (amountL, target) => {
        const current = Number(get().todayHabits.water?.value || 0)
        const meta = get().todayHabits.water?.metadata || { pure_water: 0, mate_water: 0 }
        const newMeta = { ...meta, pure_water: (meta.pure_water || 0) + amountL }
        await get().upsertHabit('water', current + amountL, target, newMeta)
      },

      // Mate helper — 1L mate = 0.7L effective hydration
      addMate: async (termosCount, target) => {
        const current = Number(get().todayHabits.water?.value || 0)
        const effective = termosCount * WATER_UNITS.MATE
        const meta = get().todayHabits.water?.metadata || { pure_water: 0, mate_water: 0 }
        const newMeta = { ...meta, mate_water: (meta.mate_water || 0) + effective }
        await get().upsertHabit('water', current + effective, target, newMeta)
      },

      // Get water breakdown
      getWaterBreakdown: () => {
        const meta = get().todayHabits.water?.metadata
        return {
          pure: meta?.pure_water || 0,
          mate: meta?.mate_water || 0,
          total: Number(get().todayHabits.water?.value || 0),
          isMateOnly: (meta?.pure_water || 0) === 0 && (meta?.mate_water || 0) > 0,
        }
      },
    }),
    {
      name: 'brim-habits',
      partialize: (state) => ({ todayHabits: state.todayHabits }),
    }
  )
)

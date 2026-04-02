import { create } from 'zustand'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

export const useRoutineStore = create((set) => ({
  routine: null,
  loading: false,
  error: null,

  generateRoutine: async (time = 60, focus = 'fuerza') => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(EDGE_URL + '/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ time, focus }),
      })
      const data = await res.json()
      if (data.error) {
        set({ loading: false, error: data.error })
        return null
      }
      set({ routine: data, loading: false })
      return data
    } catch (err) {
      set({ loading: false, error: String(err) })
      return null
    }
  },

  clearRoutine: () => set({ routine: null }),
}))

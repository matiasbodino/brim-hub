import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

export const usePlanStore = create((set, get) => ({
  todayPlan: null,
  loading: false,
  error: null,
  _lastFetched: 0,

  fetchTodayPlan: async () => {
    if (Date.now() - get()._lastFetched < 30000) return
    set({ _lastFetched: Date.now() })
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('date', today)
      .maybeSingle()
    set({ todayPlan: data || null })
  },

  generatePlan: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(EDGE_URL + '/daily-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.error) {
        set({ loading: false, error: data.error })
        return
      }
      set({ todayPlan: data, loading: false })
    } catch (err) {
      set({ loading: false, error: String(err) })
    }
  },

  recalculate: async () => {
    try {
      const res = await fetch(EDGE_URL + '/daily-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({ recalculate: true }),
      })
      const data = await res.json()
      if (!data.error) set({ todayPlan: data })
    } catch { /* silent */ }
  },

  getTimeOfDay: () => {
    const h = new Date().getHours()
    if (h < 14) return 'morning'
    if (h < 20) return 'midday'
    return 'evening'
  },
}))

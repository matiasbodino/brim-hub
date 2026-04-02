import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

export const useInsightsStore = create((set, get) => ({
  insights: [],
  userModel: null,
  loading: false,
  generating: false,
  lastGenerated: null,

  fetchInsights: async () => {
    const { data } = await supabase
      .from('user_insights')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('active', true)
      .order('confidence', { ascending: false })
    set({ insights: data || [] })
  },

  fetchUserModel: async () => {
    const { data } = await supabase
      .from('user_model')
      .select('*')
      .eq('user_id', MATI_ID)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    set({
      userModel: data || null,
      lastGenerated: data?.generated_at || null,
    })
  },

  generateInsights: async () => {
    set({ generating: true })
    try {
      const res = await fetch(EDGE_URL + '/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.error) {
        set({ generating: false })
        return data
      }
      await get().fetchInsights()
      await get().fetchUserModel()
      set({ generating: false })
      return data
    } catch (err) {
      set({ generating: false })
      return { error: String(err) }
    }
  },

  dismissInsight: async (id) => {
    await supabase
      .from('user_insights')
      .update({ active: false })
      .eq('id', id)
    set({ insights: get().insights.filter(i => i.id !== id) })
  },
}))

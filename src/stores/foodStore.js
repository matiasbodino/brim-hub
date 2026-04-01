import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

export const useFoodStore = create((set, get) => ({
  todayLogs: [],
  loading: false,
  aiEstimate: null,   // current AI estimate pending confirmation
  aiLoading: false,
  aiError: null,

  fetchToday: async () => {
    set({ loading: true })
    const today = new Date().toISOString().slice(0, 10)
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

  // AI food parsing
  parseWithAI: async (text, mealType) => {
    set({ aiLoading: true, aiError: null, aiEstimate: null })
    try {
      const res = await fetch(EDGE_URL + '/parse-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({ text, meal_type: mealType || null }),
      })
      const data = await res.json()
      if (data.error) {
        set({ aiLoading: false, aiError: data.error })
        return null
      }
      set({ aiLoading: false, aiEstimate: { ...data, rawInput: text } })
      return data
    } catch (err) {
      set({ aiLoading: false, aiError: 'Error de conexión' })
      return null
    }
  },

  confirmAIEstimate: async (estimate) => {
    // Save to food_logs
    const log = await get().addLog({
      meal_type: estimate.meal_type,
      description: estimate.description,
      calories: estimate.calories,
      protein: estimate.protein,
      carbs: estimate.carbs,
      fat: estimate.fat,
      confirmed: true,
    })

    // Save to ai_food_estimates
    if (log) {
      await supabase.from('ai_food_estimates').insert({
        user_id: MATI_ID,
        food_log_id: log.id,
        raw_input: estimate.rawInput || estimate.description,
        ai_estimate: {
          calories: estimate.calories,
          protein: estimate.protein,
          carbs: estimate.carbs,
          fat: estimate.fat,
          confidence: estimate.confidence,
          breakdown: estimate.breakdown,
        },
        user_confirmed: true,
      })
    }

    set({ aiEstimate: null })
    return log
  },

  confirmWithOverride: async (estimate, override) => {
    const log = await get().addLog({
      meal_type: estimate.meal_type,
      description: estimate.description,
      calories: override.calories,
      protein: override.protein,
      carbs: override.carbs,
      fat: override.fat,
      confirmed: true,
    })

    if (log) {
      await supabase.from('ai_food_estimates').insert({
        user_id: MATI_ID,
        food_log_id: log.id,
        raw_input: estimate.rawInput || estimate.description,
        ai_estimate: {
          calories: estimate.calories,
          protein: estimate.protein,
          carbs: estimate.carbs,
          fat: estimate.fat,
          confidence: estimate.confidence,
          breakdown: estimate.breakdown,
        },
        user_confirmed: true,
        user_override: override,
      })
    }

    set({ aiEstimate: null })
    return log
  },

  clearAIEstimate: () => set({ aiEstimate: null, aiError: null }),
}))

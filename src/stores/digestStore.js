import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID, HABITS } from '../lib/constants'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

function getLastMonday() {
  var d = new Date()
  var day = d.getDay()
  var diff = day === 0 ? 7 : day
  d.setDate(d.getDate() - diff - 6)
  return d.toISOString().slice(0, 10)
}

async function gatherWeekStats(weekStart) {
  const weekEnd = new Date(weekStart + 'T12:00:00')
  weekEnd.setDate(weekEnd.getDate() + 6)
  const endStr = weekEnd.toISOString().slice(0, 10)

  // Habits
  const { data: habits } = await supabase
    .from('habit_logs')
    .select('date, habit_type, completion_type')
    .eq('user_id', MATI_ID)
    .gte('date', weekStart)
    .lte('date', endStr)

  const totalLogs = (habits || []).length
  const fullCount = (habits || []).filter(h => h.completion_type === 'full').length
  const completionRate = totalLogs > 0 ? Math.round((fullCount / totalLogs) * 100) : 0
  const bjjSessions = (habits || []).filter(h => h.habit_type === 'bjj' && h.completion_type === 'full').length
  const waterDays = (habits || []).filter(h => h.habit_type === 'water' && h.completion_type === 'full').length
  const gymSessions = (habits || []).filter(h => h.habit_type === 'gym' && h.completion_type === 'full').length

  // Food
  const startISO = new Date(weekStart + 'T00:00:00-03:00').toISOString()
  const endISO = new Date(endStr + 'T23:59:59-03:00').toISOString()
  const { data: food } = await supabase
    .from('food_logs')
    .select('calories, protein')
    .eq('user_id', MATI_ID)
    .gte('logged_at', startISO)
    .lte('logged_at', endISO)

  const totalCals = (food || []).reduce((a, f) => a + (f.calories || 0), 0)
  const daysWithFood = new Set((food || []).map(f => f.logged_at?.slice(0, 10))).size
  const avgCalories = daysWithFood > 0 ? Math.round(totalCals / daysWithFood) : 0

  // Points
  const { data: points } = await supabase
    .from('points_log')
    .select('points')
    .eq('user_id', MATI_ID)
    .gte('date', weekStart)
    .lte('date', endStr)
  const totalPoints = (points || []).reduce((a, p) => a + p.points, 0)

  return {
    completionRate,
    bjjSessions,
    gymSessions,
    waterDays,
    avgCalories,
    totalPoints,
    weekStart,
    weekEnd: endStr,
  }
}

export const useDigestStore = create((set) => ({
  currentDigest: null,
  loading: false,
  error: null,

  fetchCurrentWeek: async () => {
    var weekStart = getLastMonday()
    var { data } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('week_start', weekStart)
      .maybeSingle()
    set({ currentDigest: data || null })
  },

  generateDigest: async () => {
    set({ loading: true, error: null })
    try {
      const weekStart = getLastMonday()
      const stats = await gatherWeekStats(weekStart)

      var res = await fetch(EDGE_URL + '/weekly-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({ stats }),
      })
      var data = await res.json()
      if (data.error) {
        set({ loading: false, error: data.error })
        return
      }
      set({ currentDigest: data, loading: false })
    } catch (err) {
      set({ loading: false, error: String(err) })
    }
  },
}))

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID, HABITS } from '../lib/constants'

export const useCycleStore = create((set, get) => ({
  activeCycle: null,
  cycleTargets: [],
  weeklyStats: [],   // array of 4 weeks, each with per-habit stats
  pastCycles: [],
  loading: false,

  fetchActive: async () => {
    set({ loading: true })
    const { data: cycle } = await supabase
      .from('cycles')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!cycle) {
      set({ activeCycle: null, cycleTargets: [], weeklyStats: [], loading: false })
      return
    }

    const { data: targets } = await supabase
      .from('cycle_targets')
      .select('*')
      .eq('cycle_id', cycle.id)

    // Fetch habit_logs for the cycle period
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('date, habit_type, value, target, completion_type')
      .eq('user_id', MATI_ID)
      .gte('date', cycle.started_at)
      .lte('date', cycle.ends_at)

    // Calculate weekly stats (4 weeks)
    const weeks = []
    const start = new Date(cycle.started_at + 'T12:00:00')
    for (let w = 0; w < 4; w++) {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + w * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const ws = weekStart.toISOString().slice(0, 10)
      const we = weekEnd.toISOString().slice(0, 10)

      const weekLogs = (logs || []).filter(l => l.date >= ws && l.date <= we)
      const habitStats = {}
      HABITS.forEach(h => {
        const hLogs = weekLogs.filter(l => l.habit_type === h.type)
        const full = hLogs.filter(l => l.completion_type === 'full').length
        const partial = hLogs.filter(l => l.completion_type === 'partial').length
        const target = (targets || []).find(t => t.habit_type === h.type)
        habitStats[h.type] = {
          full,
          partial,
          weeklyTarget: target ? target.weekly_target : 0,
        }
      })
      weeks.push({ weekNum: w + 1, start: ws, end: we, habits: habitStats })
    }

    set({
      activeCycle: cycle,
      cycleTargets: targets || [],
      weeklyStats: weeks,
      loading: false,
    })
  },

  fetchPast: async () => {
    const { data } = await supabase
      .from('cycles')
      .select('*')
      .eq('user_id', MATI_ID)
      .neq('status', 'active')
      .order('ended_at', { ascending: false })
      .limit(10)
    set({ pastCycles: data || [] })
  },

  createCycle: async (name, targets) => {
    const today = new Date().toISOString().slice(0, 10)
    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + 27)
    const ends = endsAt.toISOString().slice(0, 10)

    const { data: cycle, error } = await supabase
      .from('cycles')
      .insert({
        user_id: MATI_ID,
        name,
        started_at: today,
        ends_at: ends,
      })
      .select()
      .single()
    if (error) throw error

    // Insert targets
    const rows = Object.entries(targets).map(([habit_type, weekly_target]) => ({
      cycle_id: cycle.id,
      habit_type,
      weekly_target,
    }))
    if (rows.length > 0) {
      await supabase.from('cycle_targets').insert(rows)
    }

    await get().fetchActive()
    return cycle
  },

  completeCycle: async (reflection) => {
    const cycle = get().activeCycle
    if (!cycle) return
    await supabase
      .from('cycles')
      .update({ status: 'completed', reflection: reflection || null })
      .eq('id', cycle.id)
    set({ activeCycle: null, cycleTargets: [], weeklyStats: [] })
  },
}))

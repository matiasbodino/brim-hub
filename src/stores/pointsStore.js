import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID, POINTS, HABITS, DEFAULT_PERMITIDOS, getLevel } from '../lib/constants'

export const usePointsStore = create((set, get) => ({
  totalPoints: 0,
  spentPoints: 0,
  redeemHistory: [],
  streak: 0,
  loading: false,

  get balance() { return get().totalPoints - get().spentPoints },

  fetchAll: async () => {
    set({ loading: true })
    // Fetch points earned
    const { data: pointsData } = await supabase
      .from('points_log')
      .select('points')
      .eq('user_id', MATI_ID)
    const total = (pointsData || []).reduce((a, r) => a + r.points, 0)

    // Fetch redeems
    const { data: redeems } = await supabase
      .from('redeems')
      .select('*')
      .eq('user_id', MATI_ID)
      .order('redeemed_at', { ascending: false })
    const spent = (redeems || []).reduce((a, r) => a + r.cost, 0)

    // Fetch streak
    const streak = await get().calcStreak()

    set({ totalPoints: total, spentPoints: spent, redeemHistory: redeems || [], streak, loading: false })
  },

  // Calculate consecutive days: valid = 1+ full OR 2+ partials ("never miss twice")
  calcStreak: async () => {
    const { data } = await supabase
      .from('habit_logs')
      .select('date, value, target, completion_type')
      .eq('user_id', MATI_ID)
      .order('date', { ascending: false })
      .limit(100)
    if (!data || data.length === 0) return 0

    const byDate = {}
    data.forEach(h => {
      if (!byDate[h.date]) byDate[h.date] = { full_count: 0, partial_count: 0 }
      if (h.completion_type === 'full') byDate[h.date].full_count++
      else if (h.completion_type === 'partial') byDate[h.date].partial_count++
    })

    let streak = 0
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    for (let i = 0; i < 100; i++) {
      const key = d.toISOString().slice(0, 10)
      const day = byDate[key]
      const isValidDay = day && (
        day.full_count >= HABITS.length ||
        day.full_count >= 1 ||
        day.partial_count >= 2
      )
      if (isValidDay) {
        streak++
      } else if (i > 0) {
        break
      }
      d.setDate(d.getDate() - 1)
    }
    return streak
  },

  // Award points for completing a habit (multiplier: 1 = full, 0.5 = partial)
  awardPoints: async (source, basePoints, multiplier = 1) => {
    const today = new Date().toISOString().slice(0, 10)
    const streak = get().streak
    let points = Math.round(basePoints * multiplier)

    // Streak multiplier
    if (streak >= 7) {
      points = Math.round(points * POINTS.streak_7_multiplier)
    }

    const { error } = await supabase
      .from('points_log')
      .insert({
        user_id: MATI_ID,
        date: today,
        source,
        points,
      })
    if (error) return
    set({ totalPoints: get().totalPoints + points })
  },

  // Check and award perfect day bonus
  checkPerfectDay: async () => {
    const today = new Date().toISOString().slice(0, 10)
    // Check if already awarded today
    const { data: existing } = await supabase
      .from('points_log')
      .select('id')
      .eq('user_id', MATI_ID)
      .eq('date', today)
      .eq('source', 'perfect_day')
    if (existing && existing.length > 0) return

    // Check all habits completed
    const { data: habits } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('date', today)
    if (!habits || habits.length < HABITS.length) return
    const allDone = habits.every(h => Number(h.value) >= Number(h.target))
    if (!allDone) return

    // Award bonus (sum of today's points)
    const { data: todayPoints } = await supabase
      .from('points_log')
      .select('points')
      .eq('user_id', MATI_ID)
      .eq('date', today)
      .neq('source', 'perfect_day')
    const sum = (todayPoints || []).reduce((a, r) => a + r.points, 0)

    await supabase.from('points_log').insert({
      user_id: MATI_ID,
      date: today,
      source: 'perfect_day',
      points: sum, // x2 = original + bonus equal to original
    })
    set({ totalPoints: get().totalPoints + sum })
  },

  // Redeem a permitido
  redeem: async (item) => {
    const balance = get().totalPoints - get().spentPoints
    if (balance < item.cost) throw new Error('No tenés suficientes créditos')

    const { data, error } = await supabase
      .from('redeems')
      .insert({
        user_id: MATI_ID,
        item: item.name,
        emoji: item.emoji,
        cost: item.cost,
      })
      .select()
      .single()
    if (error) throw error
    set({
      spentPoints: get().spentPoints + item.cost,
      redeemHistory: [data, ...get().redeemHistory],
    })
  },

  getLevel: () => getLevel(get().totalPoints),
}))

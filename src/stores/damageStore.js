import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

export const useDamageStore = create((set, get) => ({
  activePlan: null,
  loading: false,

  fetchActive: async () => {
    const { data } = await supabase
      .from('damage_control')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    set({ activePlan: data || null })
  },

  // Create a damage control plan
  // Spreads excess over 3-5 days: reduces calories + adds steps
  createPlan: async (excessKcal, reason = '') => {
    set({ loading: true })
    // Spread strategy: gentle, never more than 300 kcal/day reduction
    const maxDailyReduction = 300
    const spreadDays = Math.max(3, Math.min(5, Math.ceil(excessKcal / maxDailyReduction)))
    const dailyReduction = Math.round(excessKcal / spreadDays)
    // Extra steps: proportional to excess, capped at 3000
    const dailyExtraSteps = Math.min(3000, Math.round(excessKcal / spreadDays * 2))

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() + 1) // starts tomorrow
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + spreadDays - 1)

    const plan = {
      user_id: MATI_ID,
      excess_kcal: excessKcal,
      reason: reason || 'Exceso no especificado',
      spread_days: spreadDays,
      daily_reduction: dailyReduction,
      daily_extra_steps: dailyExtraSteps,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      days_completed: 0,
      active: true,
    }

    // Deactivate any existing plan
    await supabase
      .from('damage_control')
      .update({ active: false })
      .eq('user_id', MATI_ID)
      .eq('active', true)

    const { data } = await supabase
      .from('damage_control')
      .insert(plan)
      .select()
      .single()

    set({ activePlan: data, loading: false })
    return {
      plan: data,
      message: `Tranqui. Para compensar ${excessKcal} kcal, los próximos ${spreadDays} días bajamos ${dailyReduction} kcal y sumamos ${dailyExtraSteps} pasos extra cada día.`,
    }
  },

  // Mark today as completed in the recovery plan
  markDayCompleted: async () => {
    const plan = get().activePlan
    if (!plan) return
    const newCompleted = plan.days_completed + 1
    const isFinished = newCompleted >= plan.spread_days

    await supabase
      .from('damage_control')
      .update({
        days_completed: newCompleted,
        active: !isFinished,
      })
      .eq('id', plan.id)

    set({
      activePlan: isFinished ? null : { ...plan, days_completed: newCompleted },
    })
  },
}))

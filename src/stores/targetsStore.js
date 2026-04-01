import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID, TARGETS } from '../lib/constants'

export const useTargetsStore = create((set, get) => ({
  targets: { ...TARGETS },
  loading: false,
  loaded: false,

  fetchTargets: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('user_profile')
      .select('daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_steps_target, weekly_bjj_target, weekly_gym_target, target_weight')
      .eq('id', MATI_ID)
      .maybeSingle()

    if (data) {
      set({
        targets: {
          calories: data.daily_calorie_target ?? TARGETS.calories,
          protein: data.daily_protein_target ?? TARGETS.protein,
          carbs: data.daily_carbs_target ?? TARGETS.carbs,
          fat: data.daily_fat_target ?? TARGETS.fat,
          water: Number(data.daily_water_target) || TARGETS.water,
          steps: data.daily_steps_target ?? TARGETS.steps,
          bjj_weekly: data.weekly_bjj_target ?? TARGETS.bjj_weekly,
          gym_weekly: data.weekly_gym_target ?? TARGETS.gym_weekly,
          target_weight: data.target_weight ?? null,
        },
        loading: false,
        loaded: true,
      })
    } else {
      set({ loading: false, loaded: true })
    }
  },

  saveTargets: async (newTargets) => {
    const { error } = await supabase
      .from('user_profile')
      .upsert({
        id: MATI_ID,
        daily_calorie_target: newTargets.calories,
        daily_protein_target: newTargets.protein,
        daily_carbs_target: newTargets.carbs,
        daily_fat_target: newTargets.fat,
        daily_water_target: newTargets.water,
        daily_steps_target: newTargets.steps,
        weekly_bjj_target: newTargets.bjj_weekly,
        weekly_gym_target: newTargets.gym_weekly,
        target_weight: newTargets.target_weight ?? null,
        display_name: 'Mati',
      }, { onConflict: 'id' })
    if (error) return false
    set({ targets: { ...newTargets } })
    return true
  },
}))

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

export const useReportStore = create((set) => ({
  data: null,
  loading: false,

  fetchMonthData: async (year, month) => {
    set({ loading: true })
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0)
    const end = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`

    const [foodRes, weightRes, habitRes, energyRes] = await Promise.all([
      supabase.from('food_logs').select('logged_at,meal_type,description,calories,protein,carbs,fat')
        .eq('user_id', MATI_ID).gte('logged_at', start + 'T00:00:00-03:00').lte('logged_at', end + 'T23:59:59-03:00').order('logged_at'),
      supabase.from('weight_logs').select('date,weight').eq('user_id', MATI_ID).gte('date', start).lte('date', end).order('date'),
      supabase.from('habit_logs').select('date,habit_type,value,target,completion_type').eq('user_id', MATI_ID).gte('date', start).lte('date', end),
      supabase.from('daily_logs').select('date,energy_level').eq('user_id', MATI_ID).gte('date', start).lte('date', end),
    ])

    const food = foodRes.data || []
    const weights = weightRes.data || []
    const habits = habitRes.data || []
    const energy = energyRes.data || []

    // Macros totals
    const totalCal = food.reduce((a, f) => a + (f.calories || 0), 0)
    const totalProt = food.reduce((a, f) => a + Number(f.protein || 0), 0)
    const totalCarbs = food.reduce((a, f) => a + Number(f.carbs || 0), 0)
    const totalFat = food.reduce((a, f) => a + Number(f.fat || 0), 0)
    const foodDays = new Set(food.map(f => f.logged_at?.slice(0, 10))).size
    const avgCal = foodDays > 0 ? Math.round(totalCal / foodDays) : 0
    const avgProt = foodDays > 0 ? Math.round(totalProt / foodDays) : 0

    // Macro distribution %
    const macroTotal = (totalProt * 4) + (totalCarbs * 4) + (totalFat * 9)
    const protPct = macroTotal > 0 ? Math.round((totalProt * 4) / macroTotal * 100) : 0
    const carbsPct = macroTotal > 0 ? Math.round((totalCarbs * 4) / macroTotal * 100) : 0
    const fatPct = macroTotal > 0 ? Math.round((totalFat * 9) / macroTotal * 100) : 0

    // Top 5 foods
    const foodFreq = {}
    food.forEach(f => {
      const key = (f.description || '').toLowerCase().trim()
      if (!key) return
      if (!foodFreq[key]) foodFreq[key] = { count: 0, cal: 0 }
      foodFreq[key].count++
      foodFreq[key].cal += f.calories || 0
    })
    const topFoods = Object.entries(foodFreq)
      .map(([name, v]) => ({ name, count: v.count, avgCal: Math.round(v.cal / v.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Food by day (for table)
    const foodByDay = {}
    food.forEach(f => {
      const day = f.logged_at?.slice(0, 10)
      if (!foodByDay[day]) foodByDay[day] = []
      foodByDay[day].push(f)
    })

    // Weight
    const weightFirst = weights.length > 0 ? weights[0].weight : null
    const weightLast = weights.length > 0 ? weights[weights.length - 1].weight : null
    const weightDelta = weightFirst && weightLast ? Number((weightLast - weightFirst).toFixed(1)) : null

    // Habits
    const waterDays = habits.filter(h => h.habit_type === 'water' && h.completion_type === 'full').length
    const stepsDays = habits.filter(h => h.habit_type === 'steps' && h.completion_type === 'full').length
    const gymDays = habits.filter(h => h.habit_type === 'gym' && h.completion_type === 'full').length
    const bjjDays = habits.filter(h => h.habit_type === 'bjj' && h.completion_type === 'full').length
    const totalDays = endDate.getDate()

    // Steps avg
    const stepsLogs = habits.filter(h => h.habit_type === 'steps')
    const avgSteps = stepsLogs.length > 0 ? Math.round(stepsLogs.reduce((a, h) => a + Number(h.value || 0), 0) / stepsLogs.length) : 0

    // Water avg
    const waterLogs = habits.filter(h => h.habit_type === 'water')
    const avgWater = waterLogs.length > 0 ? Math.round(waterLogs.reduce((a, h) => a + Number(h.value || 0), 0) / waterLogs.length * 10) / 10 : 0

    // Energy avg
    const avgEnergy = energy.length > 0 ? Math.round(energy.reduce((a, e) => a + e.energy_level, 0) / energy.length * 10) / 10 : null

    // Protein compliance (days where protein >= 120g)
    const protByDay = {}
    food.forEach(f => {
      const day = f.logged_at?.slice(0, 10)
      protByDay[day] = (protByDay[day] || 0) + Number(f.protein || 0)
    })
    const protComplianceDays = Object.values(protByDay).filter(p => p >= 120).length
    const protCompliance = foodDays > 0 ? Math.round((protComplianceDays / foodDays) * 100) : 0

    set({
      loading: false,
      data: {
        month: `${year}-${String(month).padStart(2, '0')}`,
        totalDays,
        avgCal, avgProt,
        protPct, carbsPct, fatPct,
        topFoods,
        foodByDay,
        weightFirst, weightLast, weightDelta,
        waterDays, stepsDays, gymDays, bjjDays,
        avgSteps, avgWater, avgEnergy,
        protCompliance,
        foodDaysLogged: foodDays,
      }
    })
  },
}))

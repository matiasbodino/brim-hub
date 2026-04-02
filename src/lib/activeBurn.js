// Active calorie burn estimation based on METs
// Reference weight: ~85kg (Mati)

const WEIGHT_KG = 85

// MET values (metabolic equivalent)
// 1 MET = 1 kcal/kg/hour at rest
const METS = {
  walking: 3.5,      // brisk walk (~5km/h)
  gym_strength: 5.0,  // resistance training moderate-vigorous
  bjj_drilling: 6.0,  // technique work
  bjj_rolling: 9.5,   // live sparring — one of the highest MET activities
}

// Conversions
const STEPS_PER_KM = 1300 // average stride
const WALKING_SPEED_KMH = 5.0
const BASE_KCAL_PER_HOUR = WEIGHT_KG * 1 // resting burn (subtracted since it's already in TDEE)

/**
 * Calculate burn from steps
 * 10,000 steps ≈ 7.7km ≈ 1.54 hours walking ≈ 460 kcal gross ≈ 330 kcal net (above rest)
 */
export function burnFromSteps(steps) {
  if (!steps || steps <= 0) return 0
  const km = steps / STEPS_PER_KM
  const hours = km / WALKING_SPEED_KMH
  const gross = WEIGHT_KG * METS.walking * hours
  const net = gross - (BASE_KCAL_PER_HOUR * hours) // subtract resting
  return Math.round(Math.max(0, net))
}

/**
 * Calculate burn from gym session
 * 1 hour intense = ~300 kcal net
 * Uses RPE to scale: RPE 5 = 0.7x, RPE 7 = 1.0x, RPE 10 = 1.3x
 */
export function burnFromGym(durationMin, rpe = 7) {
  if (!durationMin || durationMin <= 0) return 0
  const hours = durationMin / 60
  const rpeMultiplier = 0.7 + (Math.min(10, Math.max(1, rpe)) - 5) * 0.06 // 5→0.7, 7→0.82, 10→1.0... let me recalc
  // Simpler: RPE scales from 0.6x (RPE 1) to 1.3x (RPE 10)
  const scale = 0.6 + (rpe - 1) * (0.7 / 9)
  const gross = WEIGHT_KG * METS.gym_strength * hours * scale
  const net = gross - (BASE_KCAL_PER_HOUR * hours)
  return Math.round(Math.max(0, net))
}

/**
 * Calculate burn from BJJ session
 * 1 hour rolling = ~700-900 kcal gross = ~600-800 kcal net
 * Tipo: 'Gi' slightly less intense, 'No-Gi' slightly more (negligible)
 * Mix of drilling (60%) and rolling (40%) for a typical session
 */
export function burnFromBJJ(durationMin) {
  if (!durationMin || durationMin <= 0) return 0
  const hours = durationMin / 60
  // Typical session: 60% drilling + 40% live rolling
  const avgMET = METS.bjj_drilling * 0.6 + METS.bjj_rolling * 0.4
  const gross = WEIGHT_KG * avgMET * hours
  const net = gross - (BASE_KCAL_PER_HOUR * hours)
  return Math.round(Math.max(0, net))
}

/**
 * Get today's total active burn from habit logs
 * todayHabits = { water: {...}, steps: {value}, gym: {value}, bjj: {value, metadata} }
 * lastWorkout = { duration_min, rpe } from workout_logs (optional)
 */
export function getTodayBurn(todayHabits, lastWorkout = null) {
  const steps = Number(todayHabits?.steps?.value || 0)
  const gymDone = Number(todayHabits?.gym?.value || 0) >= 1
  const bjjDone = Number(todayHabits?.bjj?.value || 0) >= 1
  const bjjMeta = todayHabits?.bjj?.metadata

  let total = 0
  const breakdown = []

  // Steps burn
  if (steps > 0) {
    const burn = burnFromSteps(steps)
    total += burn
    breakdown.push({ source: 'Caminata', emoji: '🚶', burn, detail: `${steps.toLocaleString()} pasos` })
  }

  // Gym burn
  if (gymDone) {
    const dur = lastWorkout?.duration_min || 60
    const rpe = lastWorkout?.rpe || 7
    const burn = burnFromGym(dur, rpe)
    total += burn
    breakdown.push({ source: 'Gym', emoji: '🏋️', burn, detail: `${dur}min · RPE ${rpe}` })
  }

  // BJJ burn
  if (bjjDone) {
    const dur = bjjMeta?.duracion || 90
    const burn = burnFromBJJ(dur)
    total += burn
    breakdown.push({ source: 'BJJ', emoji: '🥋', burn, detail: `${dur}min` })
  }

  return { total, breakdown }
}

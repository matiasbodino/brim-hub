// Contextual suggested actions for Dashboard (max 2)

export function getSuggestedActions(todayHabits, todayLogs, todayPlan, targets, routine, damagePlan = null) {
  const h = new Date().getHours()
  const actions = []

  const waterVal = Number(todayHabits.water?.value || 0)
  const waterTarget = targets.water || 2.5
  const gymDone = Number(todayHabits.gym?.value || 0) >= 1
  const bjjDone = Number(todayHabits.bjj?.value || 0) >= 1

  // Meal timing
  const hasMealType = (type) => todayLogs.some(l => l.meal_type === type)
  const calTarget = targets.calories || 2100
  const calEaten = todayLogs.reduce((a, l) => a + (l.calories || 0), 0)
  const calRemaining = Math.max(0, calTarget - calEaten)

  // Priority: routine ready
  if (routine && !gymDone) {
    actions.push({ id: 'workout', emoji: '🏋️', text: `Rutina lista: ${routine.routine_name}`, cta: 'EMPEZAR', to: '/workout', state: { routine }, color: 'orange' })
  }

  // Meal suggestions by time
  if (h >= 7 && h < 10 && !hasMealType('desayuno') && todayLogs.length === 0) {
    actions.push({ id: 'breakfast', emoji: '☕', text: `Logueá tu desayuno`, cta: 'Registrar', to: '/activity', color: 'green' })
  }
  if (h >= 12 && h < 15 && !hasMealType('almuerzo')) {
    actions.push({ id: 'lunch', emoji: '🍽', text: `Logueá tu almuerzo · ~${Math.min(calRemaining, 800)} kcal disponibles`, cta: 'Registrar', to: '/activity', color: 'green' })
  }
  if (h >= 19 && h < 23 && !hasMealType('cena')) {
    actions.push({ id: 'dinner', emoji: '🌙', text: `Logueá tu cena · ~${Math.min(calRemaining, 700)} kcal disponibles`, cta: 'Registrar', to: '/activity', color: 'green' })
  }

  // Water reminder (>3h without)
  if (waterVal < waterTarget && waterVal < waterTarget * 0.6) {
    actions.push({ id: 'water', emoji: '💧', text: `¿Tomaste agua? Llevás ${waterVal.toFixed(1)}L de ${waterTarget}L`, cta: 'Registrar', to: '/activity', color: 'blue' })
  }

  // Damage control
  if (damagePlan) {
    actions.push({ id: 'damage', emoji: '📉', text: `Recuperación día ${damagePlan.days_completed + 1}/${damagePlan.spread_days} · Target ${(targets.calories || 2100) - (damagePlan.daily_reduction || 0)} kcal`, cta: '', to: '/profile', color: 'amber' })
  }

  // Sunday checkin
  if (new Date().getDay() === 0) {
    actions.push({ id: 'checkin', emoji: '📋', text: 'Check-in semanal disponible', cta: 'Ir', to: '/checkin', color: 'violet' })
  }

  // Night journal
  if (h >= 21) {
    actions.push({ id: 'journal', emoji: '📝', text: '¿Cómo estuvo tu día?', cta: 'Escribir', to: '/activity', color: 'violet' })
  }

  return actions.slice(0, 2)
}

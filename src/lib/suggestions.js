// Contextual suggested actions for Dashboard (max 2, ALWAYS at least 1)

export function getSuggestedActions(todayHabits, todayLogs, todayPlan, targets, routine, damagePlan = null) {
  const h = new Date().getHours()
  const actions = []

  const waterVal = Number(todayHabits.water?.value || 0)
  const waterTarget = targets.water || 2.5
  const stepsVal = Number(todayHabits.steps?.value || 0)
  const gymDone = Number(todayHabits.gym?.value || 0) >= 1
  const bjjDone = Number(todayHabits.bjj?.value || 0) >= 1

  const hasMealType = (type) => todayLogs.some(l => l.meal_type === type)
  const calTarget = targets.calories || 2100
  const calEaten = todayLogs.reduce((a, l) => a + (l.calories || 0), 0)
  const calRemaining = Math.max(0, calTarget - calEaten)

  // P1: Routine ready
  if (routine && !gymDone) {
    actions.push({ id: 'workout', emoji: '🏋️', text: `Rutina lista: ${routine.routine_name}`, cta: 'EMPEZAR', to: '/workout', state: { routine }, color: 'orange' })
  }

  // P2: Meals by expanded windows
  if (h >= 6 && h < 11 && !hasMealType('desayuno')) {
    actions.push({ id: 'breakfast', emoji: '☕', text: 'Logueá tu desayuno', cta: 'Registrar', to: '/activity', color: 'green' })
  } else if (h >= 11 && h < 16 && !hasMealType('almuerzo')) {
    actions.push({ id: 'lunch', emoji: '🍽', text: `Logueá tu almuerzo · ~${Math.min(calRemaining, 800)} kcal`, cta: 'Registrar', to: '/activity', color: 'green' })
  } else if (h >= 16 && h < 19 && !hasMealType('merienda')) {
    actions.push({ id: 'snack', emoji: '🧉', text: `Merienda · ~${Math.min(calRemaining, 400)} kcal`, cta: 'Registrar', to: '/activity', color: 'green' })
  } else if (h >= 19 && !hasMealType('cena')) {
    actions.push({ id: 'dinner', emoji: '🌙', text: `Logueá tu cena · ~${Math.min(calRemaining, 700)} kcal`, cta: 'Registrar', to: '/activity', color: 'green' })
  }

  // P3: Water
  if (waterVal < waterTarget * 0.8) {
    actions.push({ id: 'water', emoji: '💧', text: `Agua: ${waterVal.toFixed(1)}L de ${waterTarget}L`, cta: 'Registrar', to: '/activity', color: 'blue' })
  }

  // P4: Steps (afternoon)
  if (h >= 13 && stepsVal < 5000) {
    actions.push({ id: 'steps', emoji: '🚶', text: `${stepsVal > 0 ? stepsVal.toLocaleString() + ' pasos' : 'Registrá tus pasos'}`, cta: 'Registrar', to: '/activity', color: 'blue' })
  }

  // P5: Damage control
  if (damagePlan) {
    actions.push({ id: 'damage', emoji: '📉', text: `Recuperación día ${damagePlan.days_completed + 1}/${damagePlan.spread_days}`, cta: '', to: '/profile', color: 'amber' })
  }

  // P6: Movement (afternoon, no gym/bjj)
  if (h >= 15 && !gymDone && !bjjDone && !routine) {
    actions.push({ id: 'move', emoji: '💪', text: '¿Hoy toca mover el cuerpo?', cta: 'Actividades', to: '/activity', color: 'orange' })
  }

  // P7: Sunday checkin
  if (new Date().getDay() === 0) {
    actions.push({ id: 'checkin', emoji: '📋', text: 'Check-in semanal', cta: 'Ir', to: '/checkin', color: 'violet' })
  }

  // P8: Night journal
  if (h >= 21) {
    actions.push({ id: 'journal', emoji: '📝', text: '¿Cómo estuvo tu día?', cta: 'Escribir', to: '/activity', color: 'violet' })
  }

  // Fallback: always at least 1 action
  if (actions.length === 0) {
    if (todayLogs.length === 0) {
      actions.push({ id: 'start', emoji: '🎯', text: 'Empezá registrando algo — comida, agua o pasos', cta: 'Registrar', to: '/activity', color: 'blue' })
    } else {
      actions.push({ id: 'keep', emoji: '💪', text: 'Vas bien. Seguí así.', cta: '', to: '', color: 'green' })
    }
  }

  return actions.slice(0, 2)
}

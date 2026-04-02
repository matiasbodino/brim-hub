// Haptic feedback patterns for native-feel interactions

const v = (pattern) => {
  try { navigator.vibrate(pattern) } catch {}
}

// Light tap — quick actions (+vaso, +botella, +1000 pasos, selectors)
export const hapticLight = () => v(10)

// Medium tap — confirmations (guardar peso, loggear comida, marcar gym)
export const hapticMedium = () => v(50)

// Heavy — important events (generar rutina, generar plan)
export const hapticHeavy = () => v(80)

// Heartbeat — celebrations (100% vitality, PR, level up)
export const hapticHeartbeat = () => v([30, 100, 30])

// Success pattern — completed action
export const hapticSuccess = () => v([30, 50])

// Error — something went wrong
export const hapticError = () => v([50, 30, 50])

// Convenience alias (backwards compatible)
export const haptic = hapticLight

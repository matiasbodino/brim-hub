// Mati's hardcoded user ID (no auth, personal app)
export const MATI_ID = 'c17e4105-4861-43c8-bf13-0d32f7818418'

// Daily targets (editable in Profile later)
export const TARGETS = {
  calories: 2100,
  protein: 150,
  carbs: 210,
  fat: 70,
  water: 2.5,
  steps: 10000,
  bjj_weekly: 2,
  gym_weekly: 2,
}

// Habit definitions
export const HABITS = [
  { type: 'water', label: 'Agua', emoji: '💧', target: TARGETS.water, unit: 'L' },
  { type: 'steps', label: 'Pasos', emoji: '🚶', target: TARGETS.steps, unit: '' },
  { type: 'bjj', label: 'BJJ', emoji: '🥋', target: 1, unit: '' },
  { type: 'gym', label: 'Gym', emoji: '🏋️', target: 1, unit: '' },
]

// Points per habit completed
export const POINTS = {
  water: 5,
  steps: 10,
  bjj: 20,
  gym: 15,
  calories_in_range: 10,
  perfect_day_multiplier: 2,
  perfect_week_bonus: 50,
  streak_7_multiplier: 1.5,
}

// Levels based on total accumulated points (not redeemed)
export const LEVELS = [
  { name: 'Cinturón Blanco', badge: '🤍', min: 0 },
  { name: 'Cinturón Azul', badge: '💙', min: 500 },
  { name: 'Cinturón Violeta', badge: '💜', min: 1500 },
  { name: 'Cinturón Marrón', badge: '🤎', min: 3500 },
  { name: 'Cinturón Negro', badge: '🖤', min: 7000 },
]

// Default permitidos catalog
export const DEFAULT_PERMITIDOS = [
  { id: 'pizza', name: 'Pizza', emoji: '🍕', cost: 30 },
  { id: 'birra', name: 'Birra', emoji: '🍺', cost: 15 },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', cost: 10 },
  { id: 'helado', name: 'Helado', emoji: '🍦', cost: 20 },
  { id: 'gaming', name: 'Tarde de gaming', emoji: '🎮', cost: 25 },
  { id: 'comida_basura', name: 'Comida chatarra', emoji: '🍔', cost: 25 },
  { id: 'fernet', name: 'Fernet', emoji: '🥃', cost: 20 },
  { id: 'dia_libre', name: 'Día libre total', emoji: '😴', cost: 50 },
]

// Get current level from total points
export function getLevel(totalPoints) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].min) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || null
      break
    }
  }
  return { current, next }
}

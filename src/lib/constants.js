// Mati's hardcoded user ID (no auth, personal app)
export const MATI_ID = 'c17e4105-4861-43c8-bf13-0d32f7818418'

// Water units (L) — effective hydration
export const WATER_UNITS = {
  VASO: 0.25,     // 250ml agua pura
  BOTELLA: 0.5,   // 500ml agua pura
  TERMO: 1.0,     // 1L agua pura
  MATE: 0.7,      // 1L mate = 700ml hidratación efectiva (cafeína descuenta)
}

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
  { type: 'water', label: 'Agua', emoji: '💧', target: TARGETS.water, unit: 'L', cue: 'Tomá el primer vaso apenas te levantás', identity: 'Eso es lo que hace alguien que cuida su cuerpo.', timeOfDay: 'morning' },
  { type: 'steps', label: 'Pasos', emoji: '🚶', target: TARGETS.steps, unit: '', cue: 'Salí a caminar después del almuerzo', identity: 'Eso es lo que hace alguien que se mueve todos los días.', timeOfDay: 'afternoon' },
  { type: 'bjj', label: 'BJJ', emoji: '🥋', target: 1, unit: '', cue: 'Preparate la bolsa antes de las 17h', identity: 'Eso es lo que hace un luchador.', timeOfDay: 'afternoon' },
  { type: 'gym', label: 'Gym', emoji: '🏋️', target: 1, unit: '', cue: 'Ponete la ropa de gym apenas te levantás', identity: 'Eso es lo que hace alguien que se entrena.', timeOfDay: 'morning' },
]

// Habits grouped by time of day (derived from HABITS)
export const HABIT_GROUPS = {
  morning: {
    label: 'Mañana',
    emoji: '☀️',
    habits: HABITS.filter(h => h.timeOfDay === 'morning'),
  },
  afternoon: {
    label: 'Tarde',
    emoji: '🌤️',
    habits: HABITS.filter(h => h.timeOfDay === 'afternoon'),
  },
  evening: {
    label: 'Noche',
    emoji: '🌙',
    habits: HABITS.filter(h => h.timeOfDay === 'evening'),
  },
}

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
export const SHIELD_COST = 100

export const DEFAULT_PERMITIDOS = [
  { id: 'streak_shield', name: 'Escudo de Racha', emoji: '🛡️', cost: SHIELD_COST, functional: true },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', cost: 30 },
  { id: 'birra', name: 'Birra', emoji: '🍺', cost: 15 },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', cost: 10 },
  { id: 'helado', name: 'Helado', emoji: '🍦', cost: 20 },
  { id: 'gaming', name: 'Tarde de gaming', emoji: '🎮', cost: 25 },
  { id: 'comida_basura', name: 'Comida chatarra', emoji: '🍔', cost: 25 },
  { id: 'fernet', name: 'Fernet', emoji: '🥃', cost: 20 },
  { id: 'dia_libre', name: 'Día libre total', emoji: '😴', cost: 50 },
]

// Default gym exercises for PR tracking
export const GYM_EXERCISES = [
  'Sentadilla',
  'Peso muerto',
  'Press banca',
  'Press militar',
  'Dominadas',
  'Remo con barra',
  'Hip thrust',
  'Curl bíceps',
  'Press inclinado',
  'Farmer carry',
]

export const BJJ_TECHNIQUES = [
  { name: 'Closed Guard', category: 'guard', emoji: '🛡️' },
  { name: 'Half Guard', category: 'guard', emoji: '🛡️' },
  { name: 'Butterfly Guard', category: 'guard', emoji: '🦋' },
  { name: 'De La Riva', category: 'guard', emoji: '🛡️' },
  { name: 'Spider Guard', category: 'guard', emoji: '🕷️' },
  { name: 'Toreando', category: 'pass', emoji: '💨' },
  { name: 'Knee Slice', category: 'pass', emoji: '🔪' },
  { name: 'Over-Under', category: 'pass', emoji: '🔄' },
  { name: 'Leg Drag', category: 'pass', emoji: '🦵' },
  { name: 'Armbar', category: 'sub', emoji: '💪' },
  { name: 'Triangle', category: 'sub', emoji: '🔺' },
  { name: 'Guillotine', category: 'sub', emoji: '⚔️' },
  { name: 'Kimura', category: 'sub', emoji: '🔒' },
  { name: 'RNC', category: 'sub', emoji: '😵' },
  { name: 'Bow & Arrow', category: 'sub', emoji: '🏹' },
  { name: 'Scissor Sweep', category: 'sweep', emoji: '✂️' },
  { name: 'Hip Bump', category: 'sweep', emoji: '🫸' },
  { name: 'Single Leg', category: 'takedown', emoji: '🦵' },
  { name: 'Double Leg', category: 'takedown', emoji: '🤼' },
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

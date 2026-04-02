// Vitality Score = Hydration 25% + Nutrition 25% + Movement 30% + Energy 20%

function calculateVitality({ todayHabits, macros, targets, todayEnergy }) {
  // Hydration (25%) — water progress vs target
  const waterVal = Number(todayHabits.water?.value || 0)
  const waterTarget = targets.water || 2.5
  const hydration = Math.min(100, Math.round((waterVal / waterTarget) * 100))

  // Nutrition (25%) — calories + protein vs target (penalize over AND under)
  const calPct = targets.calories > 0 ? macros.calories / targets.calories : 0
  const protPct = targets.protein > 0 ? macros.protein / targets.protein : 0
  // Sweet spot: 80-110% of target = full score. Below or above = penalty
  const calScore = calPct >= 0.8 && calPct <= 1.1 ? 100 : calPct < 0.8 ? Math.round(calPct * 125) : Math.max(0, Math.round((2 - calPct) * 100))
  const protScore = Math.min(100, Math.round(protPct * 100))
  const nutrition = Math.round((calScore + protScore) / 2)

  // Movement (30%) — gym OR bjj + steps
  const gymDone = Number(todayHabits.gym?.value || 0) >= 1
  const bjjDone = Number(todayHabits.bjj?.value || 0) >= 1
  const stepsVal = Number(todayHabits.steps?.value || 0)
  const stepsTarget = targets.steps || 10000
  const stepsPct = Math.min(100, Math.round((stepsVal / stepsTarget) * 100))
  const exerciseDone = gymDone || bjjDone
  // Exercise = 60% of movement, steps = 40%
  const movement = Math.round((exerciseDone ? 60 : 0) + (stepsPct * 0.4))

  // Energy (20%) — perceived energy 1-5 → 0-100
  const energyVal = todayEnergy || 0
  const energy = energyVal > 0 ? Math.round((energyVal / 5) * 100) : 50 // default 50 if not logged

  // Weighted total
  const total = Math.round(hydration * 0.25 + nutrition * 0.25 + movement * 0.30 + energy * 0.20)

  return { total, hydration, nutrition, movement, energy }
}

function getVitalityColor(score) {
  if (score >= 80) return '#8b5cf6' // violet vibrant
  if (score >= 60) return '#6366f1' // indigo
  if (score >= 40) return '#3b82f6' // blue
  if (score >= 20) return '#f59e0b' // amber
  return '#ef4444' // red/orange
}

function getVitalityMessage(score) {
  if (score >= 90) return 'Con este nivel de carga, mañana te llevás el mundo por delante. Oss!'
  if (score >= 75) return 'Buen día. Seguí así y la semana cierra redonda.'
  if (score >= 60) return 'Vas bien, pero te faltan un par de cosas. Metele.'
  if (score >= 40) return 'Día flojo. Todavía podés rescatarlo si te movés ahora.'
  if (score >= 20) return 'Che, ¿estás vivo? Arrancá con un vaso de agua al menos.'
  return 'Día en pausa. Mañana es otro round.'
}

export default function VitalityRing({ todayHabits, macros, targets, todayEnergy }) {
  const v = calculateVitality({ todayHabits, macros, targets, todayEnergy })
  const color = getVitalityColor(v.total)
  const msg = getVitalityMessage(v.total)

  const radius = 58
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (v.total / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      {/* Ring */}
      <div className="relative w-44 h-44 mb-3">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-1000"
            style={{ filter: v.total >= 80 ? `drop-shadow(0 0 8px ${color}60)` : 'none' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black" style={{ color }}>{v.total}%</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vitalidad</span>
        </div>
      </div>

      {/* Brim message */}
      <p className="text-xs text-slate-500 text-center italic max-w-[280px] mb-4">"{msg}"</p>

      {/* Mini breakdown */}
      <div className="flex gap-4 text-center">
        {[
          { label: 'Agua', val: v.hydration, emoji: '💧' },
          { label: 'Nutri', val: v.nutrition, emoji: '🍽' },
          { label: 'Move', val: v.movement, emoji: '🏃' },
          { label: 'Energy', val: v.energy, emoji: '⚡' },
        ].map(s => (
          <div key={s.label} className="flex-1">
            <span className="text-sm">{s.emoji}</span>
            <p className="text-xs font-black text-slate-700">{s.val}%</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

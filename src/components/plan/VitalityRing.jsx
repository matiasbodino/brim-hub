import { useEffect, useRef } from 'react'
import { getTodayBurn } from '../../lib/activeBurn'
import { useAnimatedValue } from '../../hooks/useAnimatedValue'
import { hapticHeartbeat } from '../../lib/haptics'
import { useBJJTheme } from '../../hooks/useBJJTheme'
import confetti from 'canvas-confetti'

// Wellness Score — Nutrition is king (80% weight when no food = max 20% possible)
// Weights: Nutrition 50%, Movement 20%, Hydration 15%, Energy 15%

function calculateVitality({ todayHabits, macros, targets, todayEnergy }) {
  // Hydration (15%)
  const waterVal = Number(todayHabits.water?.value || 0)
  const waterTarget = targets.water || 2.5
  const hydration = Math.min(100, Math.round((waterVal / waterTarget) * 100))

  // Nutrition (50%) — THE dominant factor
  const hasFood = macros.calories > 0
  const calPct = targets.calories > 0 ? macros.calories / targets.calories : 0
  const protPct = targets.protein > 0 ? macros.protein / targets.protein : 0
  const calScore = calPct >= 0.8 && calPct <= 1.1 ? 100 : calPct < 0.8 ? Math.round(calPct * 125) : Math.max(0, Math.round((2 - calPct) * 100))
  const protScore = Math.min(100, Math.round(protPct * 100))
  const nutrition = hasFood ? Math.round((calScore + protScore) / 2) : 0

  // Movement (20%)
  const gymDone = Number(todayHabits.gym?.value || 0) >= 1
  const bjjDone = Number(todayHabits.bjj?.value || 0) >= 1
  const stepsVal = Number(todayHabits.steps?.value || 0)
  const stepsTarget = targets.steps || 10000
  const stepsPct = Math.min(100, Math.round((stepsVal / stepsTarget) * 100))
  const exerciseDone = gymDone || bjjDone
  const movement = Math.round((exerciseDone ? 60 : 0) + (stepsPct * 0.4))

  // Energy (15%)
  const energyVal = todayEnergy || 0
  const energy = energyVal > 0 ? Math.round((energyVal / 5) * 100) : 50

  // Weighted total — no food = max 20% (movement 20% + hydration 15% partial + energy 15% partial)
  const total = Math.round(nutrition * 0.50 + movement * 0.20 + hydration * 0.15 + energy * 0.15)

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

export default function VitalityRing({ todayHabits, macros, targets, todayEnergy, damageActive }) {
  const v = calculateVitality({ todayHabits, macros, targets, todayEnergy })
  const color = getVitalityColor(v.total)
  const msg = getVitalityMessage(v.total)
  const animatedScore = useAnimatedValue(v.total)
  const { colors: themeColors } = useBJJTheme()
  const celebrated = useRef(false)

  // Confetti at 100% vitality
  useEffect(() => {
    if (v.total >= 100 && !celebrated.current) {
      celebrated.current = true
      hapticHeartbeat()
      // Belt-colored confetti
      const beltHex = themeColors?.primary || '#7c3aed'
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: [beltHex, '#ffffff', '#f59e0b'],
      })
    }
  }, [v.total])

  const radius = 58
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (v.total / 100) * circumference
  // Damage control: show pending compensation as orange shadow
  const dmgPct = damageActive ? Math.min(15, 100 - v.total) : 0
  const dmgOffset = circumference - ((v.total + dmgPct) / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      {/* Ring */}
      <div className="relative w-44 h-44 mb-3">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          {/* Damage control pending zone (orange shadow) */}
          {damageActive && dmgPct > 0 && (
            <circle cx="70" cy="70" r={radius} fill="none" stroke="#fdba7440" strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={dmgOffset} strokeLinecap="round" />
          )}
          {/* Main vitality arc */}
          <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-1000"
            style={{ filter: v.total >= 80 ? `drop-shadow(0 0 8px ${color}60)` : 'none' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black" style={{ color }}>{Math.round(animatedScore)}%</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vitalidad</span>
        </div>
      </div>

      {/* Brim message */}
      <p className="text-xs text-slate-500 text-center italic max-w-[280px] mb-4">"{msg}"</p>

      {/* Calorie Ring — consumed vs dynamic target */}
      {(() => {
        const burn = getTodayBurn(todayHabits)
        const baseTarget = targets.calories || 2100
        const dynamicTarget = baseTarget + burn.total
        const consumed = macros.calories || 0
        const remaining = Math.max(0, dynamicTarget - consumed)
        const calPct = dynamicTarget > 0 ? Math.min(100, Math.round((consumed / dynamicTarget) * 100)) : 0
        const burnPct = dynamicTarget > 0 ? Math.round((burn.total / dynamicTarget) * 100) : 0

        const r = 40
        const circ = 2 * Math.PI * r
        const consumedOffset = circ - (calPct / 100) * circ
        // Bonus zone: the portion of the ring that represents burn calories
        const bonusStart = baseTarget / dynamicTarget * 100
        const bonusOffset = circ - (bonusStart / 100) * circ

        const ringColor = calPct > 100 ? '#ef4444' : calPct > 85 ? '#f59e0b' : '#6366f1'

        return (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-4">
              {/* Mini calorie ring */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Base track */}
                  <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
                  {/* Burn bonus zone (lighter shade) */}
                  {burn.total > 0 && (
                    <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="7"
                      strokeDasharray={circ} strokeDashoffset={bonusOffset} strokeLinecap="round" />
                  )}
                  {/* Consumed */}
                  <circle cx="50" cy="50" r={r} fill="none" stroke={ringColor} strokeWidth="7"
                    strokeDasharray={circ} strokeDashoffset={consumedOffset}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black" style={{ color: ringColor }}>{remaining}</span>
                  <span className="text-[7px] font-bold opacity-50 uppercase">kcal left</span>
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold opacity-80">
                  {consumed} / {dynamicTarget} kcal
                </p>
                <p className="text-[10px] opacity-50 mt-0.5">
                  {remaining > 0
                    ? `Te quedan ${remaining} kcal para tu déficit ideal`
                    : `Pasaste el target por ${consumed - dynamicTarget} kcal`
                  }
                </p>
                {burn.total > 0 && (
                  <p className="text-[10px] opacity-40 mt-1">
                    🔥 +{burn.total} kcal extras por entrenamiento
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Mini breakdown */}
      <div className="flex gap-4 text-center mt-3 pt-3 border-t border-white/10">
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

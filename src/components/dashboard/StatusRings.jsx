import { useAnimatedValue } from '../../hooks/useAnimatedValue'

// 3 concentric rings: Energy (calories), Activity (steps+gym), Recovery (water)
export default function StatusRings({ macros, targets, todayHabits, todayEnergy }) {
  const calTarget = targets.calories || 2100
  const calConsumed = macros.calories || 0
  const calPct = Math.min(100, Math.round((calConsumed / calTarget) * 100))

  const stepsVal = Number(todayHabits.steps?.value || 0)
  const stepsTarget = targets.steps || 10000
  const gymDone = Number(todayHabits.gym?.value || 0) >= 1
  const bjjDone = Number(todayHabits.bjj?.value || 0) >= 1
  const activityPct = Math.min(100, Math.round(((stepsVal / stepsTarget) * 60 + (gymDone || bjjDone ? 40 : 0))))

  const waterVal = Number(todayHabits.water?.value || 0)
  const waterTarget = targets.water || 2.5
  const recoveryPct = Math.min(100, Math.round((waterVal / waterTarget) * 100))

  const animCal = useAnimatedValue(calPct)
  const animAct = useAnimatedValue(activityPct)
  const animRec = useAnimatedValue(recoveryPct)

  // Dominant score for center text
  const avgPct = Math.round((calPct + activityPct + recoveryPct) / 3)

  const rings = [
    { pct: animCal, color: '#8b5cf6', radius: 62, width: 8, label: 'Energía' },
    { pct: animAct, color: '#06b6d4', radius: 50, width: 8, label: 'Actividad' },
    { pct: animRec, color: '#10b981', radius: 38, width: 8, label: 'Recuperación' },
  ]

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/30 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.08)]">
      <div className="relative w-44 h-44 mx-auto">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          {rings.map((r, i) => {
            const circ = 2 * Math.PI * r.radius
            const offset = circ - (r.pct / 100) * circ
            return [
              <circle key={`bg-${i}`} cx="70" cy="70" r={r.radius} fill="none" stroke="#f1f5f9" strokeWidth={r.width} opacity="0.5" />,
              <circle key={`fg-${i}`} cx="70" cy="70" r={r.radius} fill="none" stroke={r.color} strokeWidth={r.width}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                className="transition-all duration-1000"
                style={{ filter: r.pct >= 80 ? `drop-shadow(0 0 6px ${r.color}50)` : 'none' }}
              />,
            ]
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-800 tracking-tight">{Math.round(avgPct)}%</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">Hoy</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-5 mt-4">
        {rings.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'

const tooltipStyle = {
  borderRadius: '1rem',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  fontSize: 12,
}

// Epley formula: 1RM = weight × (1 + reps/30)
function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0
  return Math.round(Number(weight) * (1 + Number(reps) / 30))
}

// ─── 1RM Timeline per Big Lift ───

const BIG_LIFTS = ['Sentadilla', 'Press banca', 'Peso muerto']
const LIFT_COLORS = { 'Sentadilla': '#6366f1', 'Press banca': '#f59e0b', 'Peso muerto': '#ef4444' }

export function OneRepMaxChart({ prs }) {
  const chartData = useMemo(() => {
    // Group PRs by date for big lifts
    const byDate = {}
    for (const pr of prs) {
      if (!BIG_LIFTS.includes(pr.exercise)) continue
      const date = pr.date
      if (!byDate[date]) byDate[date] = { date }
      const e1rm = estimate1RM(pr.weight, pr.reps)
      // Keep the highest 1RM per exercise per date
      const key = pr.exercise
      if (!byDate[date][key] || e1rm > byDate[date][key]) {
        byDate[date][key] = e1rm
      }
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      date: new Date(d.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    }))
  }, [prs])

  if (chartData.length < 2) {
    return <p className="text-sm text-slate-400 italic">Registrá al menos 2 sesiones de los big lifts para ver la curva de 1RM</p>
  }

  return (
    <div>
      <div className="flex gap-3 mb-3 justify-center">
        {BIG_LIFTS.map(lift => (
          <span key={lift} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-3 h-1 rounded-full" style={{ backgroundColor: LIFT_COLORS[lift] }} />
            {lift}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => v + ' kg (est.)'} />
          {BIG_LIFTS.map(lift => (
            <Line key={lift} type="monotone" dataKey={lift} stroke={LIFT_COLORS[lift]} strokeWidth={2.5}
              dot={{ fill: LIFT_COLORS[lift], r: 3, strokeWidth: 0 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Muscle Balance Radar ───

const MUSCLE_GROUPS = {
  'Empuje': ['Press banca', 'Press militar', 'Press inclinado'],
  'Tracción': ['Remo con barra', 'Dominadas'],
  'Piernas': ['Sentadilla', 'Peso muerto', 'Hip thrust'],
  'Core': ['Farmer carry'],
  'Brazos': ['Curl bíceps'],
}

export function BalanceRadar({ prs }) {
  const radarData = useMemo(() => {
    const scores = {}
    for (const [group, exercises] of Object.entries(MUSCLE_GROUPS)) {
      const groupPRs = prs.filter(p => exercises.some(e => p.exercise.toLowerCase().includes(e.toLowerCase())))
      if (groupPRs.length === 0) {
        scores[group] = 0
        continue
      }
      // Score = sum of estimated 1RMs / number of exercises expected
      const total1RM = groupPRs.reduce((sum, p) => {
        const e1rm = estimate1RM(p.weight, p.reps)
        return Math.max(sum, e1rm) // take max per group
      }, 0)
      scores[group] = total1RM
    }

    // Normalize to 0-100 based on max score
    const maxScore = Math.max(...Object.values(scores), 1)
    return Object.entries(scores).map(([group, score]) => ({
      group,
      score: Math.round((score / maxScore) * 100),
      raw: score,
    }))
  }, [prs])

  // Detect imbalance
  const imbalance = useMemo(() => {
    const scored = radarData.filter(d => d.score > 0)
    if (scored.length < 3) return null
    const avg = scored.reduce((a, d) => a + d.score, 0) / scored.length
    const weakest = scored.reduce((min, d) => d.score < min.score ? d : min, scored[0])
    const strongest = scored.reduce((max, d) => d.score > max.score ? d : max, scored[0])
    if (strongest.score - weakest.score > 40) {
      return { weak: weakest.group, strong: strongest.group, gap: strongest.score - weakest.score }
    }
    return null
  }, [radarData])

  if (radarData.every(d => d.score === 0)) {
    return <p className="text-sm text-slate-400 italic">Registrá PRs en diferentes ejercicios para ver tu balance muscular</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="group" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
          <Radar name="Balance" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Raw values */}
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {radarData.filter(d => d.raw > 0).map(d => (
          <span key={d.group} className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
            {d.group}: {d.raw}kg
          </span>
        ))}
      </div>

      {/* Imbalance insight */}
      {imbalance && (
        <div className="bg-amber-50 rounded-xl px-4 py-3 mt-3 flex items-start gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-xs text-amber-700">
            Estás descuidando <strong>{imbalance.weak}</strong> (gap de {imbalance.gap}% vs {imbalance.strong}).
            El próximo mes priorizá ejercicios de {imbalance.weak.toLowerCase()} para equilibrar.
          </p>
        </div>
      )}
    </div>
  )
}

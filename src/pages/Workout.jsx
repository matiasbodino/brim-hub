import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useHabitStore } from '../stores/habitStore'
import { useGymPrStore } from '../stores/gymPrStore'
import { usePointsStore } from '../stores/pointsStore'
import { POINTS } from '../lib/constants'
import { useToast } from '../components/Toast'
import { track } from '../lib/analytics'

// ─── Rest Timer ───

function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 100])
          onDone()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [seconds])

  const pct = ((seconds - remaining) / seconds) * 100
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#6366f1" strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-slate-800">{remaining}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">segundos</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-4">Descansando...</p>
      <button
        onClick={() => { clearInterval(intervalRef.current); onDone() }}
        className="mt-4 text-xs font-bold text-indigo-600 active:text-indigo-800"
      >
        Saltar descanso →
      </button>
    </div>
  )
}

// ─── Exercise Screen ───

function ExerciseScreen({ exercise, exerciseIndex, total, prs, onSetComplete, onFinishExercise }) {
  const [currentSet, setCurrentSet] = useState(0)
  const [weight, setWeight] = useState(String(exercise.target_weight || ''))
  const [reps, setReps] = useState(String(exercise.target_reps || ''))
  const [setLogs, setSetLogs] = useState([])
  const [resting, setResting] = useState(false)
  const [isPR, setIsPR] = useState(false)

  const maxPR = prs.find(p => p.exercise.toLowerCase() === exercise.name.toLowerCase())
  const maxWeight = maxPR ? Number(maxPR.weight) : 0

  const handleCompleteSet = () => {
    const w = Number(weight)
    const r = Number(reps)
    if (!w || !r) return

    if (window.navigator.vibrate) window.navigator.vibrate(15)

    const newLog = { set: currentSet + 1, weight: w, reps: r }
    setSetLogs([...setLogs, newLog])
    onSetComplete(exercise.name, newLog)

    // Check if this is a PR
    if (w > maxWeight) {
      setIsPR(true)
      if (window.navigator.vibrate) window.navigator.vibrate([50, 100, 50, 100, 50])
      setTimeout(() => setIsPR(false), 3000)
    }

    if (currentSet + 1 >= exercise.sets) {
      // All sets done for this exercise
      setTimeout(() => onFinishExercise(exercise.name, setLogs.concat(newLog)), 500)
    } else {
      setCurrentSet(currentSet + 1)
      setResting(true)
    }
  }

  if (resting) {
    return <RestTimer seconds={exercise.rest_seconds || 90} onDone={() => setResting(false)} />
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Ejercicio {exerciseIndex + 1}/{total}
        </span>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
          Set {currentSet + 1}/{exercise.sets}
        </span>
      </div>

      {/* Exercise card */}
      <div className={`rounded-[2rem] p-6 transition-all duration-500 ${
        isPR
          ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-xl shadow-amber-200'
          : exercise.category === 'main_lift'
            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
            : 'bg-white/80 backdrop-blur-md border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]'
      }`}>
        <h2 className={`text-2xl font-black mb-1 ${isPR ? 'text-white' : exercise.category === 'main_lift' ? 'text-white' : 'text-slate-800'}`}>
          {exercise.name}
        </h2>

        {isPR && (
          <p className="text-sm font-black mb-4 animate-pulse">¡Estás rompiendo límites! 🦍</p>
        )}

        {exercise.notes && (
          <p className={`text-xs mb-4 ${isPR || exercise.category === 'main_lift' ? 'opacity-70' : 'text-slate-400'}`}>
            {exercise.notes}
          </p>
        )}

        {/* Target hint */}
        <div className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${isPR || exercise.category === 'main_lift' ? 'opacity-60' : 'text-slate-400'}`}>
          Objetivo: {exercise.sets} × {exercise.target_reps} @ {exercise.target_weight}kg
          {maxWeight > 0 && <span> · PR: {maxWeight}kg</span>}
        </div>

        {/* Weight + Reps inputs */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className={`text-[10px] font-bold uppercase ${isPR || exercise.category === 'main_lift' ? 'opacity-60' : 'text-slate-400'}`}>Peso (kg)</label>
            <input
              type="number"
              step="2.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className={`w-full mt-1 px-4 py-3 rounded-xl text-lg font-black text-center ${
                isPR ? 'bg-white/20 text-white placeholder:text-white/50 border-none'
                : exercise.category === 'main_lift' ? 'bg-white/10 text-white placeholder:text-white/40 border-none'
                : 'bg-slate-50 text-slate-800 border-none'
              }`}
            />
          </div>
          <div className="flex-1">
            <label className={`text-[10px] font-bold uppercase ${isPR || exercise.category === 'main_lift' ? 'opacity-60' : 'text-slate-400'}`}>Reps</label>
            <input
              type="number"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className={`w-full mt-1 px-4 py-3 rounded-xl text-lg font-black text-center ${
                isPR ? 'bg-white/20 text-white placeholder:text-white/50 border-none'
                : exercise.category === 'main_lift' ? 'bg-white/10 text-white placeholder:text-white/40 border-none'
                : 'bg-slate-50 text-slate-800 border-none'
              }`}
            />
          </div>
        </div>

        <button
          onClick={handleCompleteSet}
          disabled={!weight || !reps}
          className={`w-full py-4 rounded-2xl font-black text-lg active:scale-[0.98] transition-all disabled:opacity-40 ${
            isPR ? 'bg-white text-amber-600'
            : exercise.category === 'main_lift' ? 'bg-white text-indigo-600'
            : 'bg-slate-900 text-white'
          }`}
        >
          {currentSet + 1 >= exercise.sets ? '✅ Último set' : '✓ Completar set'}
        </button>
      </div>

      {/* Set history */}
      {setLogs.length > 0 && (
        <div className="space-y-1 px-1">
          {setLogs.map((s, i) => (
            <div key={i} className="flex justify-between text-xs text-slate-400">
              <span>Set {s.set}</span>
              <span className="font-bold text-slate-600">{s.weight}kg × {s.reps}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───

export default function Workout() {
  const location = useLocation()
  const navigate = useNavigate()
  const routine = location.state?.routine
  const showToast = useToast()
  const { upsertHabit } = useHabitStore()
  const { prs, addPR, fetchPRs, getMaxPR } = useGymPrStore()
  const { awardPoints } = usePointsStore()

  const [currentExercise, setCurrentExercise] = useState(0)
  const [allLogs, setAllLogs] = useState({})
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPRs() }, [])

  if (!routine) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/30 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-4">No hay rutina cargada</p>
          <button onClick={() => navigate('/progress')} className="text-indigo-600 font-bold text-sm">← Volver a Progress</button>
        </div>
      </div>
    )
  }

  const exercises = routine.exercises || []

  const handleSetComplete = (name, setLog) => {
    setAllLogs(prev => ({
      ...prev,
      [name]: [...(prev[name] || []), setLog],
    }))
  }

  const handleFinishExercise = (name, sets) => {
    setAllLogs(prev => ({ ...prev, [name]: sets }))
    if (currentExercise + 1 >= exercises.length) {
      setFinished(true)
    } else {
      setCurrentExercise(currentExercise + 1)
    }
  }

  const handleFinishWorkout = async () => {
    setSaving(true)

    // 1. Mark gym as completed
    await upsertHabit('gym', 1, 1)

    // 2. Save new PRs
    for (const [exerciseName, sets] of Object.entries(allLogs)) {
      const maxSet = sets.reduce((best, s) => Number(s.weight) > Number(best.weight) ? s : best, sets[0])
      const currentMax = getMaxPR(exerciseName)
      if (!currentMax || Number(maxSet.weight) > Number(currentMax.weight)) {
        await addPR(exerciseName, maxSet.weight, maxSet.reps, 'Workout ' + new Date().toLocaleDateString('es-AR'))
      }
    }

    // 3. Award points
    await awardPoints('gym', POINTS.gym, 1)

    track('workout_completed', { routine: routine.routine_name, exercises: exercises.length })
    setSaving(false)
    showToast('🏋️ Entrenamiento guardado +' + POINTS.gym + ' pts')
    navigate('/progress')
  }

  // Finished summary
  if (finished) {
    const totalSets = Object.values(allLogs).flat().length
    const totalVolume = Object.values(allLogs).flat().reduce((a, s) => a + Number(s.weight) * Number(s.reps), 0)
    const newPRs = Object.entries(allLogs).filter(([name, sets]) => {
      const maxSet = sets.reduce((best, s) => Number(s.weight) > Number(best.weight) ? s : best, sets[0])
      const currentMax = getMaxPR(name)
      return !currentMax || Number(maxSet.weight) > Number(currentMax.weight)
    })

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/30 pb-28 pt-8 px-4 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">💪</span>
          <h1 className="text-2xl font-black text-slate-900">Entrenamiento completo</h1>
          <p className="text-sm text-slate-400 mt-1">{routine.routine_name}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20">
            <p className="text-2xl font-black text-slate-800">{exercises.length}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Ejercicios</p>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20">
            <p className="text-2xl font-black text-slate-800">{totalSets}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Sets</p>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20">
            <p className="text-2xl font-black text-slate-800">{Math.round(totalVolume / 1000)}k</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">kg total</p>
          </div>
        </div>

        {newPRs.length > 0 && (
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-[2rem] p-5 text-white mb-6 shadow-lg">
            <p className="text-xs font-black uppercase tracking-widest mb-2">🦍 Nuevos PRs</p>
            {newPRs.map(([name, sets]) => {
              const best = sets.reduce((b, s) => Number(s.weight) > Number(b.weight) ? s : best, sets[0])
              return <p key={name} className="text-sm font-bold">{name}: {best.weight}kg × {best.reps}</p>
            })}
          </div>
        )}

        <button
          onClick={handleFinishWorkout}
          disabled={saving}
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : '✅ Guardar entrenamiento'}
        </button>
      </div>
    )
  }

  // Active exercise
  const exercise = exercises[currentExercise]
  const maxPRsList = prs.map(p => ({ exercise: p.exercise, weight: Number(p.weight) }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/30 pb-28 pt-6 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <button onClick={() => { if (confirm('¿Salir del entrenamiento?')) navigate('/progress') }}
          className="text-xs text-slate-400 font-bold">← Salir</button>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{routine.routine_name}</span>
        <span className="text-xs text-slate-400">{currentExercise + 1}/{exercises.length}</span>
      </div>

      <ExerciseScreen
        key={currentExercise}
        exercise={exercise}
        exerciseIndex={currentExercise}
        total={exercises.length}
        prs={maxPRsList}
        onSetComplete={handleSetComplete}
        onFinishExercise={handleFinishExercise}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { supabase } from '../../lib/supabase'
import { MATI_ID } from '../../lib/constants'

const tooltipStyle = {
  borderRadius: '1rem',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  fontSize: 12,
}

export function WeightChart({ data, targetWeight }) {
  if (!data || data.length < 2) return <p className="text-sm text-slate-400 italic">Pesate 2 veces y la curva arranca. La balanza no muerde ⚖️</p>

  const chartData = data.map(w => ({
    date: new Date(w.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    peso: Number(w.weight),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 'bold' }} />
        <Area type="monotone" dataKey="peso" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }} />
        {targetWeight && <ReferenceLine y={targetWeight} stroke="#e2e8f0" strokeDasharray="5 5" label={{ value: 'Target', fontSize: 10, fill: '#94a3b8' }} />}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HabitWeeklyChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-400 italic">Loggeá una semana de hábitos y acá vas a ver el progreso 📈</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => v + '%'} />
        <Bar dataKey="pct" radius={[8, 8, 0, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={entry.pct >= 80 ? '#6366f1' : entry.pct >= 50 ? '#a78bfa' : '#e2e8f0'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MacroChart({ data }) {
  if (!data || data.length < 2) return <p className="text-sm text-slate-400 italic">Loggeá 2 días de comida y te muestro cómo venís con los macros 🍽</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorProt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="calories" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCal)" name="kcal" dot={false} />
        <Area type="monotone" dataKey="protein" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProt)" name="prot (g)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function useTrendData() {
  const [weightData, setWeightData] = useState([])
  const [habitWeeklyData, setHabitWeeklyData] = useState([])
  const [macroData, setMacroData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrends()
  }, [])

  async function loadTrends() {
    setLoading(true)
    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 60)
    const since = thirtyAgo.toISOString().slice(0, 10)

    // Weight - last 60 days
    const { data: weights } = await supabase
      .from('weight_logs')
      .select('date, weight')
      .eq('user_id', MATI_ID)
      .gte('date', since)
      .order('date', { ascending: true })
    setWeightData(weights || [])

    // Habits - last 8 weeks
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
    const hwSince = eightWeeksAgo.toISOString().slice(0, 10)

    const { data: habits } = await supabase
      .from('habit_logs')
      .select('date, completion_type')
      .eq('user_id', MATI_ID)
      .gte('date', hwSince)

    // Group by week
    const weeks = {}
    ;(habits || []).forEach(h => {
      const d = new Date(h.date + 'T12:00:00')
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay() + 1)
      const key = weekStart.toISOString().slice(0, 10)
      if (!weeks[key]) weeks[key] = { total: 0, full: 0 }
      weeks[key].total++
      if (h.completion_type === 'full') weeks[key].full++
    })

    const weeklyArr = Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([key, val]) => ({
        week: new Date(key + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        pct: val.total > 0 ? Math.round(val.full / val.total * 100) : 0,
      }))
    setHabitWeeklyData(weeklyArr)

    // Macros - last 14 days
    const fourteenAgo = new Date()
    fourteenAgo.setDate(fourteenAgo.getDate() - 14)
    const mSince = fourteenAgo.toISOString().slice(0, 10)

    const { data: food } = await supabase
      .from('food_logs')
      .select('logged_at, calories, protein')
      .eq('user_id', MATI_ID)
      .gte('logged_at', mSince + 'T00:00:00-03:00')
      .order('logged_at', { ascending: true })

    const byDay = {}
    ;(food || []).forEach(f => {
      const day = f.logged_at.slice(0, 10)
      if (!byDay[day]) byDay[day] = { calories: 0, protein: 0 }
      byDay[day].calories += f.calories || 0
      byDay[day].protein += Number(f.protein || 0)
    })

    const macroArr = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        calories: val.calories,
        protein: Math.round(val.protein),
      }))
    setMacroData(macroArr)

    setLoading(false)
  }

  return { weightData, habitWeeklyData, macroData, loading }
}

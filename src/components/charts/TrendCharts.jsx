import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { supabase } from '../../lib/supabase'
import { MATI_ID } from '../../lib/constants'

export function WeightChart({ data, targetWeight }) {
  if (!data || data.length < 2) return <p className="text-sm text-gray-400">Necesitás al menos 2 registros de peso</p>

  const chartData = data.map(w => ({
    date: new Date(w.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    peso: Number(w.weight),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#999' }} width={35} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey="peso" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', r: 3 }} />
        {targetWeight && <ReferenceLine y={targetWeight} stroke="#E5E7EB" strokeDasharray="5 5" label={{ value: 'Target', fontSize: 10, fill: '#999' }} />}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function HabitWeeklyChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400">Sin datos suficientes</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#999' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} width={30} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => v + '%'} />
        <Bar dataKey="pct" fill="#7C3AED" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MacroChart({ data }) {
  if (!data || data.length < 2) return <p className="text-sm text-gray-400">Necesitás al menos 2 días de comida loggeada</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} />
        <YAxis tick={{ fontSize: 10, fill: '#999' }} width={35} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey="calories" stroke="#7C3AED" strokeWidth={2} dot={false} name="kcal" />
        <Line type="monotone" dataKey="protein" stroke="#3B82F6" strokeWidth={2} dot={false} name="prot (g)" />
      </LineChart>
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
      weekStart.setDate(d.getDate() - d.getDay() + 1) // Monday
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

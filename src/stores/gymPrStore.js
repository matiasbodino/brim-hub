import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

export const useGymPrStore = create((set, get) => ({
  prs: [],           // todos los registros, ordenados por fecha desc
  loading: false,

  fetchPRs: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('gym_prs')
      .select('*')
      .eq('user_id', MATI_ID)
      .order('date', { ascending: false })
    set({ prs: data ?? [], loading: false })
  },

  addPR: async (exercise, weight, reps, notes = null) => {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('gym_prs')
      .insert({
        user_id: MATI_ID,
        exercise,
        weight: Number(weight),
        reps: Number(reps),
        notes: notes || null,
        date: today,
      })
      .select()
      .single()
    if (error) return
    set({ prs: [data, ...get().prs] })
  },

  deletePR: async (id) => {
    const { error } = await supabase
      .from('gym_prs')
      .delete()
      .eq('id', id)
    if (error) return
    set({ prs: get().prs.filter(p => p.id !== id) })
  },

  // Computed: PR máximo por ejercicio (mayor weight)
  getMaxPR: (exercise) => {
    const prs = get().prs.filter(p => p.exercise === exercise)
    if (!prs.length) return null
    return prs.reduce((max, p) =>
      Number(p.weight) > Number(max.weight) ? p : max
    )
  },

  // Computed: ejercicios únicos registrados (default + custom)
  getExercises: (defaultList) => {
    const custom = get().prs
      .map(p => p.exercise)
      .filter(e => !defaultList.includes(e))
    const unique = [...new Set(custom)]
    return [...defaultList, ...unique]
  },
}))

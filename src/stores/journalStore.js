import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

export const useJournalStore = create((set, get) => ({
  todayEntry: null,
  monthEntries: [],
  loading: false,

  fetchToday: async () => {
    var today = new Date().toISOString().slice(0, 10)
    var { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('date', today)
      .maybeSingle()
    set({ todayEntry: data || null })
  },

  save: async (content, mood) => {
    var today = new Date().toISOString().slice(0, 10)
    var row = { user_id: MATI_ID, date: today, content: content }
    if (mood) row.mood = mood
    var { data } = await supabase
      .from('journal_entries')
      .upsert(row, { onConflict: 'user_id,date' })
      .select()
      .maybeSingle()
    set({ todayEntry: data || null })
  },

  fetchMonth: async (yearMonth) => {
    var start = yearMonth + '-01'
    var endDate = new Date(parseInt(yearMonth.slice(0,4)), parseInt(yearMonth.slice(5,7)), 0)
    var end = yearMonth + '-' + String(endDate.getDate()).padStart(2, '0')
    var { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', MATI_ID)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
    set({ monthEntries: data || [] })
  },
}))

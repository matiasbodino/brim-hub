import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

function getLastMonday() {
  var d = new Date()
  var day = d.getDay()
  var diff = day === 0 ? 7 : day
  d.setDate(d.getDate() - diff - 6)
  return d.toISOString().slice(0, 10)
}

export const useDigestStore = create((set) => ({
  currentDigest: null,
  loading: false,
  error: null,

  fetchCurrentWeek: async () => {
    var weekStart = getLastMonday()
    var { data } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', MATI_ID)
      .eq('week_start', weekStart)
      .maybeSingle()
    set({ currentDigest: data || null })
  },

  generateDigest: async () => {
    set({ loading: true, error: null })
    try {
      var res = await fetch(EDGE_URL + '/weekly-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({}),
      })
      var data = await res.json()
      if (data.error) {
        set({ loading: false, error: data.error })
        return
      }
      set({ currentDigest: data, loading: false })
    } catch (err) {
      set({ loading: false, error: String(err) })
    }
  },
}))

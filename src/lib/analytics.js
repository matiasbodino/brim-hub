import { supabase } from './supabase'
import { MATI_ID } from './constants'

export function track(eventType, metadata) {
  supabase.from('app_events').insert({
    user_id: MATI_ID,
    event_type: eventType,
    metadata: metadata || null,
  })
}

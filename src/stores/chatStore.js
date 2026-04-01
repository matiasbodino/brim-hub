import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'
import { track } from '../lib/analytics'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

export const useChatStore = create((set, get) => ({
  messages: [],
  isStreaming: false,
  error: null,
  loaded: false,

  fetchHistory: async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('user_id', MATI_ID)
      .order('created_at', { ascending: false })
      .limit(20)
    const msgs = (data || []).reverse().map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      time: new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    }))
    set({ messages: msgs, loaded: true })
  },

  sendMessage: async (text) => {
    const userMsg = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    }

    const assistantMsg = {
      id: 'a-' + Date.now(),
      role: 'assistant',
      content: '',
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    }

    set(s => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
      error: null,
    }))

    track('chat_sent', { message_length: text.length })

    try {
      const history = get().messages
        .filter(m => m.id !== assistantMsg.id && m.id !== userMsg.id)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(EDGE_URL + '/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        set(s => ({
          messages: s.messages.map(m =>
            m.id === assistantMsg.id ? { ...m, content: 'Error: ' + (data.error || 'Algo salió mal') } : m
          ),
          isStreaming: false,
          error: data.error,
        }))
        return
      }

      set(s => ({
        messages: s.messages.map(m =>
          m.id === assistantMsg.id ? { ...m, content: data.reply || 'Sin respuesta' } : m
        ),
        isStreaming: false,
      }))
    } catch (err) {
      set(s => ({
        messages: s.messages.map(m =>
          m.id === assistantMsg.id ? { ...m, content: 'Error de conexión. Intentá de nuevo.' } : m
        ),
        isStreaming: false,
        error: String(err),
      }))
    }
  },

  clearHistory: async () => {
    await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', MATI_ID)
    set({ messages: [], loaded: false })
  },
}))

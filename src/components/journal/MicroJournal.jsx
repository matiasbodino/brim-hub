import { useEffect, useState } from 'react'
import { useJournalStore } from '../../stores/journalStore'

var MOODS = [
  { value: 1, emoji: '😫' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '😊' },
  { value: 5, emoji: '🔥' },
]

export default function MicroJournal() {
  var { todayEntry, fetchToday, save } = useJournalStore()
  var [text, setText] = useState('')
  var [mood, setMood] = useState(null)
  var [editing, setEditing] = useState(false)
  var [saved, setSaved] = useState(false)

  useEffect(function() { fetchToday() }, [])

  useEffect(function() {
    if (todayEntry) {
      setText(todayEntry.content || '')
      setMood(todayEntry.mood || null)
    }
  }, [todayEntry])

  var handleSave = function() {
    if (text.trim()) {
      save(text.trim(), mood)
      setSaved(true)
      setTimeout(function() { setSaved(false) }, 2000)
    }
    setEditing(false)
  }

  var handleMood = function(val) {
    var newMood = mood === val ? null : val
    setMood(newMood)
    if (text.trim()) {
      save(text.trim(), newMood)
      setSaved(true)
      setTimeout(function() { setSaved(false) }, 2000)
    }
  }

  // Saved view — tap to edit
  if (todayEntry && !editing) {
    return (
      <div
        className="bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer active:bg-gray-50 transition"
        onClick={function() { setEditing(true) }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-gray-400">📝 Hoy</p>
              <p className="text-xs text-gray-300">· tocar para editar</p>
            </div>
            <p className="text-sm text-gray-700">{todayEntry.content}</p>
          </div>
          {todayEntry.mood && (
            <span className="text-lg ml-2">{MOODS.find(function(m) { return m.value === todayEntry.mood })?.emoji}</span>
          )}
        </div>
      </div>
    )
  }

  // Edit/create view
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">📝 Micro-journal</p>
        {saved && <p className="text-xs text-emerald-500 font-semibold">✓ Guardado</p>}
      </div>
      <input
        type="text"
        value={text}
        onChange={function(e) { setText(e.target.value) }}
        onKeyDown={function(e) { if (e.key === 'Enter') handleSave() }}
        placeholder="¿Cómo fue tu día en una línea?"
        autoFocus
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-violet-500"
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {MOODS.map(function(m) {
            return (
              <button
                key={m.value}
                onClick={function() { handleMood(m.value) }}
                className={'text-xl p-1 rounded-lg transition ' + (mood === m.value ? 'bg-violet-100 scale-110' : 'opacity-50 hover:opacity-100')}
              >
                {m.emoji}
              </button>
            )
          })}
        </div>
        <button
          onClick={handleSave}
          disabled={!text.trim()}
          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white disabled:opacity-40 active:scale-95 transition"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

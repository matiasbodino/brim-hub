import { useEffect, useState } from 'react'
import { useJournalStore } from '../../stores/journalStore'

var MOODS = [
  { value: 1, emoji: '\u{1F62B}' },
  { value: 2, emoji: '\u{1F615}' },
  { value: 3, emoji: '\u{1F610}' },
  { value: 4, emoji: '\u{1F60A}' },
  { value: 5, emoji: '\u{1F525}' },
]

export default function MicroJournal() {
  var { todayEntry, fetchToday, save } = useJournalStore()
  var [text, setText] = useState('')
  var [mood, setMood] = useState(null)
  var [editing, setEditing] = useState(false)

  useEffect(function() { fetchToday() }, [])

  useEffect(function() {
    if (todayEntry) {
      setText(todayEntry.content || '')
      setMood(todayEntry.mood || null)
    }
  }, [todayEntry])

  var handleBlur = function() {
    if (text.trim()) {
      save(text.trim(), mood)
    }
    setEditing(false)
  }

  var handleMood = function(val) {
    var newMood = mood === val ? null : val
    setMood(newMood)
    if (text.trim()) save(text.trim(), newMood)
  }

  if (todayEntry && !editing) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100" onClick={function() { setEditing(true) }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">{'\u{1F4DD}'} Hoy</p>
            <p className="text-sm text-gray-700">{todayEntry.content}</p>
          </div>
          {todayEntry.mood && (
            <span className="text-lg ml-2">{MOODS.find(function(m) { return m.value === todayEntry.mood })?.emoji}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
      <p className="text-xs text-gray-400">{'\u{1F4DD}'} Micro-journal</p>
      <input
        type="text"
        value={text}
        onChange={function(e) { setText(e.target.value) }}
        onBlur={handleBlur}
        placeholder="\u00BFC\u00F3mo fue tu d\u00EDa en una l\u00EDnea?"
        autoFocus={editing}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-violet-500"
      />
      <div className="flex gap-2 justify-center">
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
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useDigestStore } from '../../stores/digestStore'

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map(function(line, i) {
    var processed = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
    if (line.startsWith('- ')) {
      processed = '<span style="margin-left:8px">• ' + processed.slice(2) + '</span>'
    }
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: processed }} />
        {i < text.split('\n').length - 1 && <br />}
      </span>
    )
  })
}

export default function WeeklyDigest() {
  var { currentDigest, loading, error, fetchCurrentWeek, generateDigest } = useDigestStore()
  var [expanded, setExpanded] = useState(false)

  useEffect(function() { fetchCurrentWeek() }, [])

  // Only show Mon-Wed + Sun
  var dayOfWeek = new Date().getDay()
  if (dayOfWeek > 3 && dayOfWeek !== 0) return null

  if (!currentDigest && !loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-xl text-base">✨</div>
            <div>
              <h3 className="font-bold text-sm">Resumen semanal</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Tu semana analizada por Brim</p>
            </div>
          </div>
          <button
            onClick={generateDigest}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500 text-white active:scale-95 transition disabled:opacity-40"
          >
            Generar
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-indigo-500 rounded-lg animate-pulse" />
          <span className="text-sm text-slate-300">Brim está analizando tu semana...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden border border-slate-800 transition-all">
      {/* Blur decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-[60px] rounded-full" />

      <div className="relative z-10">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={function() { setExpanded(!expanded) }}
        >
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500 rounded-xl text-base">✨</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Resumen Semanal AI</span>
          </div>
          <span className={`text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {/* Mini KPIs - always visible */}
        {currentDigest.insights && (
          <div className="grid grid-cols-3 gap-2 py-4 mt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xl font-black">{currentDigest.insights.activeDays}/7</p>
              <p className="text-[8px] uppercase text-slate-500 font-bold tracking-tighter">Días activos</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black">+{currentDigest.insights.totalPoints}</p>
              <p className="text-[8px] uppercase text-slate-500 font-bold tracking-tighter">Puntos</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black">
                {currentDigest.insights.weightDelta !== null
                  ? (currentDigest.insights.weightDelta > 0 ? '+' : '') + currentDigest.insights.weightDelta + 'kg'
                  : '—'}
              </p>
              <p className="text-[8px] uppercase text-slate-500 font-bold tracking-tighter">Peso</p>
            </div>
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in">
            <p className="text-sm leading-relaxed text-slate-300 italic mb-4">
              {renderMarkdown(currentDigest.digest_content)}
            </p>
            {currentDigest.insights?.avgCalories > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2.5 py-1 rounded-full">
                  ~{currentDigest.insights.avgCalories} kcal/día
                </span>
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-3">
              {currentDigest.week_start} → {currentDigest.week_end}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

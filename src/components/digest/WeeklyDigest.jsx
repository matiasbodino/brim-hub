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
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-6 text-white overflow-hidden transition-all">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={function() { setExpanded(!expanded) }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-xl text-base">✨</div>
          <div>
            <h3 className="font-bold text-sm">Resumen semanal</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {currentDigest.week_start} → {currentDigest.week_end}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 animate-fade-in">
          <div className="text-sm text-slate-300 leading-relaxed">
            {renderMarkdown(currentDigest.digest_content)}
          </div>
          {currentDigest.insights && (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-700">
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-1 rounded-full">
                {currentDigest.insights.activeDays}/7 días
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-full">
                +{currentDigest.insights.totalPoints} pts
              </span>
              {currentDigest.insights.avgCalories > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2.5 py-1 rounded-full">
                  ~{currentDigest.insights.avgCalories} kcal/día
                </span>
              )}
              {currentDigest.insights.weightDelta !== null && (
                <span className={'text-[10px] font-bold px-2.5 py-1 rounded-full ' +
                  (currentDigest.insights.weightDelta <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300')}>
                  {currentDigest.insights.weightDelta > 0 ? '+' : ''}{currentDigest.insights.weightDelta}kg
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

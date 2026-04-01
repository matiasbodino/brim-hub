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

  // Only show Mon-Wed
  var dayOfWeek = new Date().getDay()
  if (dayOfWeek > 3 && dayOfWeek !== 0) return null // Thu-Sat hide, Sun show

  if (!currentDigest && !loading) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">📊 Resumen semanal</h3>
            <p className="text-xs text-gray-400 mt-0.5">Tu semana anterior analizada por Brim</p>
          </div>
          <button
            onClick={generateDigest}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white active:scale-95 transition disabled:opacity-40"
          >
            Generar
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-violet-600 rounded-md animate-pulse" />
          <span className="text-sm text-gray-500">Brim está analizando tu semana...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={function() { setExpanded(!expanded) }}
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-700">📊 Resumen semanal</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {currentDigest.week_start} → {currentDigest.week_end}
          </p>
        </div>
        <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <div className="text-sm text-gray-700 leading-relaxed pt-3">
            {renderMarkdown(currentDigest.digest_content)}
          </div>
          {currentDigest.insights && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2 py-1 rounded-lg">
                {currentDigest.insights.activeDays}/7 días
              </span>
              <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-1 rounded-lg">
                +{currentDigest.insights.totalPoints} pts
              </span>
              {currentDigest.insights.avgCalories > 0 && (
                <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-1 rounded-lg">
                  ~{currentDigest.insights.avgCalories} kcal/día
                </span>
              )}
              {currentDigest.insights.weightDelta !== null && (
                <span className={'text-xs font-semibold px-2 py-1 rounded-lg ' +
                  (currentDigest.insights.weightDelta <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
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

import { useState, useRef } from 'react'
import { useReportStore } from '../../stores/reportStore'
import html2canvas from 'html2canvas'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function MacroPie({ protPct, carbsPct, fatPct }) {
  // Simple CSS pie chart
  return (
    <div className="relative w-28 h-28 mx-auto">
      <div className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(
            #6366f1 0% ${protPct}%,
            #f59e0b ${protPct}% ${protPct + carbsPct}%,
            #ef4444 ${protPct + carbsPct}% 100%
          )`
        }}
      />
      <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
        <span className="text-[10px] font-black text-slate-600">MACROS</span>
      </div>
    </div>
  )
}

export default function MonthlyReport() {
  const { data, loading, fetchMonthData } = useReportStore()
  const [generating, setGenerating] = useState(false)
  const reportRef = useRef(null)

  const now = new Date()
  const lastMonth = now.getMonth() // 0-indexed, so this is actually last month if we subtract
  const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const month = lastMonth === 0 ? 12 : lastMonth

  const handleGenerate = async () => {
    if (!data) await fetchMonthData(year, month)
  }

  const handleExportPNG = async () => {
    if (!reportRef.current) return
    setGenerating(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
        useCORS: true,
      })
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const file = new File([blob], `brim-reporte-${data.month}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Reporte Mensual - ${MONTHS[month - 1]} ${year}`,
          text: 'Mi reporte mensual de Brim Hub',
          files: [file],
        })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* user cancelled share */ }
    setGenerating(false)
  }

  if (!data && !loading) {
    return (
      <button
        onClick={handleGenerate}
        className="w-full bg-white/80 backdrop-blur-md rounded-[2rem] p-5 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] text-center active:scale-[0.98] transition"
      >
        <span className="text-2xl block mb-2">📊</span>
        <span className="text-sm font-bold text-slate-800">Generar Reporte Mensual</span>
        <p className="text-[10px] text-slate-400 mt-1">{MONTHS[month - 1]} {year} — Para tu nutri o coach</p>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 text-center">
        <div className="w-6 h-6 bg-violet-500 rounded-lg animate-pulse mx-auto mb-2" />
        <p className="text-xs text-slate-400">Compilando datos del mes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Exportable report card */}
      <div ref={reportRef} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-5">
        {/* Header */}
        <div className="text-center border-b border-slate-100 pb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Brim Hub / Reporte Mensual</p>
          <h2 className="text-lg font-black text-slate-800 mt-1">Mati Bodino — {MONTHS[month - 1]} {year}</h2>
        </div>

        {/* Weight */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Peso</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Inicio: <strong>{data.weightFirst || '—'}kg</strong></span>
            <span className="text-lg font-black text-slate-800">→</span>
            <span className="text-sm text-slate-600">Final: <strong>{data.weightLast || '—'}kg</strong></span>
            {data.weightDelta !== null && (
              <span className={`text-sm font-black px-2 py-0.5 rounded-full ${data.weightDelta <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {data.weightDelta > 0 ? '+' : ''}{data.weightDelta}kg
              </span>
            )}
          </div>
        </div>

        {/* Nutrition */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nutrición</p>
          <div className="flex items-center gap-4">
            <MacroPie protPct={data.protPct} carbsPct={data.carbsPct} fatPct={data.fatPct} />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                <span className="text-xs text-slate-600">Proteína {data.protPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-xs text-slate-600">Carbos {data.carbsPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span className="text-xs text-slate-600">Grasa {data.fatPct}%</span>
              </div>
              <div className="pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-500">Prom: <strong>{data.avgCal} kcal</strong> · <strong>{data.avgProt}g prot</strong>/día</p>
                <p className="text-xs text-slate-500">{data.foodDaysLogged} días loggeados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Protein compliance */}
        <div className="bg-indigo-50 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700">Cumplimiento proteína (≥120g)</span>
            <span className="text-sm font-black text-indigo-700">{data.protCompliance}%</span>
          </div>
          <div className="h-2 bg-indigo-200 rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: data.protCompliance + '%' }} />
          </div>
        </div>

        {/* Top foods */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Top 5 Comidas</p>
          {data.topFoods.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <span className="text-xs text-slate-700 capitalize">{f.name}</span>
              <span className="text-xs text-slate-400">{f.count}x · ~{f.avgCal} kcal</span>
            </div>
          ))}
        </div>

        {/* Vitality */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vitalidad</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-800">{data.avgSteps.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 font-bold">Pasos prom/día</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-800">{data.avgWater}L</p>
              <p className="text-[10px] text-slate-400 font-bold">Agua prom/día</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-800">{data.gymDays + data.bjjDays}</p>
              <p className="text-[10px] text-slate-400 font-bold">Sesiones (gym+bjj)</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-800">{data.avgEnergy || '—'}/5</p>
              <p className="text-[10px] text-slate-400 font-bold">Energía prom</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[8px] text-slate-300 text-center pt-2 border-t border-slate-100">
          Generado por Brim Hub · brim-hub.vercel.app
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExportPNG}
          disabled={generating}
          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black active:scale-[0.98] transition disabled:opacity-50"
        >
          {generating ? 'Generando...' : '📤 Compartir Reporte'}
        </button>
        <button
          onClick={() => useReportStore.setState({ data: null })}
          className="py-4 px-5 rounded-2xl border border-slate-200 text-slate-400 font-bold text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'

const CONFIDENCE = {
  high: { color: 'bg-emerald-100 text-emerald-700', label: 'Alta', dot: '🟢' },
  medium: { color: 'bg-amber-100 text-amber-700', label: 'Media', dot: '🟡' },
  low: { color: 'bg-red-100 text-red-700', label: 'Baja', dot: '🔴' },
}

export default function FoodEstimateCard({ estimate, onConfirm, onEdit, onRetry, onCancel }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const conf = CONFIDENCE[estimate.confidence] || CONFIDENCE.medium

  return (
    <div className="bg-white rounded-2xl border border-violet-200 overflow-hidden">
      {/* Header */}
      <div className="bg-violet-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-sm font-semibold text-violet-700">Estimación AI</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${conf.color}`}>
          {conf.dot} {conf.label}
        </span>
      </div>

      {/* Description */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm font-semibold text-gray-800">{estimate.description}</p>
        <p className="text-xs text-gray-400 mt-0.5">{estimate.meal_type}</p>
      </div>

      {/* Macros grid */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        <div className="text-center">
          <div className="text-lg font-bold text-violet-600">{estimate.calories}</div>
          <div className="text-xs text-gray-400">kcal</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{estimate.protein}g</div>
          <div className="text-xs text-gray-400">prot</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{estimate.carbs}g</div>
          <div className="text-xs text-gray-400">carbs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-500">{estimate.fat}g</div>
          <div className="text-xs text-gray-400">grasa</div>
        </div>
      </div>

      {/* Breakdown toggle */}
      {estimate.breakdown && estimate.breakdown.length > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs text-violet-500 font-semibold"
          >
            {showBreakdown ? '▲ Ocultar detalle' : '▼ Ver detalle'}
          </button>
          {showBreakdown && (
            <div className="mt-2 space-y-1.5">
              {estimate.breakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">{item.item}</span>
                  <span className="text-gray-800 font-semibold">{item.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white active:scale-95 transition"
        >
          ✅ Confirmar
        </button>
        <button
          onClick={onEdit}
          className="py-2.5 px-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 active:scale-95 transition"
        >
          ✏️
        </button>
        <button
          onClick={onRetry}
          className="py-2.5 px-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 active:scale-95 transition"
        >
          🔄
        </button>
        <button
          onClick={onCancel}
          className="py-2.5 px-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-400 active:scale-95 transition"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

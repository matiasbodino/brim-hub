// Half-circle arcs for macros (Bevel-inspired)

function MacroArc({ label, current, target, color, unit }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = current > target
  const remaining = Math.max(0, target - current)

  // SVG arc: half circle (180 degrees)
  const radius = 28
  const circ = Math.PI * radius // half circumference
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="relative w-16 h-10 mb-1">
        <svg viewBox="0 0 64 36" className="w-full h-full">
          {/* Background arc */}
          <path d="M 4 32 A 28 28 0 0 1 60 32" fill="none" stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round" />
          {/* Filled arc */}
          <path d="M 4 32 A 28 28 0 0 1 60 32" fill="none" stroke={over ? '#ef4444' : color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-end justify-center pb-0">
          <span className={`text-xs font-black ${over ? 'text-red-500' : 'text-slate-700'}`}>{current}</span>
        </div>
      </div>
      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-[9px] font-bold ${over ? 'text-red-400' : pct >= 80 ? 'text-emerald-500' : 'text-slate-300'}`}>
        {over ? `+${current - target}${unit} over` : `${remaining}${unit} left`}
      </p>
    </div>
  )
}

export default function MacroArcs({ macros, targets }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] px-4 py-4 border border-white/30 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.06)]">
      <div className="flex gap-1">
        <MacroArc label="Proteína" current={Math.round(macros.protein)} target={targets.protein || 150} color="#6366f1" unit="g" />
        <MacroArc label="Carbos" current={Math.round(macros.carbs)} target={targets.carbs || 210} color="#f59e0b" unit="g" />
        <MacroArc label="Grasa" current={Math.round(macros.fat)} target={targets.fat || 70} color="#ef4444" unit="g" />
      </div>
    </div>
  )
}

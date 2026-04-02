import { useEffect, useState } from 'react'
import { usePointsStore } from '../stores/pointsStore'
import { DEFAULT_PERMITIDOS } from '../lib/constants'
import { hapticLight } from '../lib/haptics'

export default function Permitidos() {
  const { totalPoints, spentPoints, redeemHistory, streak, fetchAll, redeem, getLevel } = usePointsStore()
  const [justRedeemed, setJustRedeemed] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const balance = totalPoints - spentPoints
  const { current: level } = getLevel()

  const handleRedeem = async (item) => {
    try {
      if (window.navigator.vibrate) window.navigator.vibrate([30, 100, 30])
      await redeem(item)
      hapticLight()
      setJustRedeemed(item)
      setTimeout(() => setJustRedeemed(null), 2500)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-32 pt-6 max-w-lg mx-auto px-4 space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-100 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-amber-100 text-xs font-black uppercase tracking-widest mb-1">Tu Tesoro</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl font-black">{balance}</h2>
            <span className="text-lg font-bold opacity-80 uppercase">pts</span>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-[10px] font-bold bg-black/10 px-3 py-1 rounded-full border border-white/20">
              {level.badge} {level.name}
            </span>
            {streak >= 7 && (
              <span className="text-[10px] font-bold bg-black/10 px-3 py-1 rounded-full border border-white/20">
                🔥 x1.5 activo
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-amber-100 font-medium">
            <span>Ganados: {totalPoints}</span>
            <span>Canjeados: {spentPoints}</span>
          </div>
        </div>
        <span className="absolute -right-4 -bottom-4 text-[8rem] opacity-10 rotate-12">💰</span>
      </div>

      {/* Just redeemed feedback */}
      {justRedeemed && (
        <div className="bg-emerald-500 rounded-[2rem] p-5 text-center text-white shadow-lg animate-pulse">
          <span className="text-4xl block mb-2">{justRedeemed.emoji}</span>
          <div className="font-black text-lg">¡{justRedeemed.name} canjeado!</div>
          <div className="text-sm opacity-80 mt-1">Disfrutalo 👊</div>
        </div>
      )}

      {/* Grid de Canjes */}
      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Catálogo</h3>
        <div className="grid grid-cols-2 gap-4">
          {DEFAULT_PERMITIDOS.map((item) => {
            const canAfford = balance >= item.cost
            return (
              <button
                key={item.id}
                disabled={!canAfford}
                onClick={() => handleRedeem(item)}
                className={`relative p-5 rounded-[2rem] border transition-all duration-300 text-left overflow-hidden ${
                  canAfford
                    ? 'bg-white border-slate-100 shadow-sm active:scale-95'
                    : 'bg-slate-100 border-transparent grayscale opacity-50'
                }`}
              >
                <span className="text-4xl mb-3 block">{item.emoji}</span>
                <h4 className="font-bold text-slate-800 leading-tight">{item.name}</h4>
                <div className="mt-2">
                  <span className={`text-xs font-black ${canAfford ? 'text-amber-600' : 'text-slate-400'}`}>
                    {item.cost} pts
                  </span>
                </div>
                {!canAfford && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-200/20 backdrop-blur-[1px]">
                    <span className="text-[8px] font-black bg-slate-800 text-white px-2 py-1 rounded-full uppercase tracking-tighter">
                      Faltan {item.cost - balance}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Historial toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full py-4 flex items-center justify-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest"
      >
        📜 {showHistory ? 'Ocultar historial' : 'Ver historial de canjes'}
      </button>

      {showHistory && redeemHistory.length > 0 && (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 space-y-1">
          {redeemHistory.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-xl">{r.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-700">{r.item}</div>
                <div className="text-[10px] text-slate-400">
                  {new Date(r.redeemed_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="text-sm text-amber-600 font-black">-{r.cost}</div>
            </div>
          ))}
        </div>
      )}

      {showHistory && redeemHistory.length === 0 && (
        <p className="text-center text-xs text-slate-400">Todavía no canjeaste nada</p>
      )}
    </div>
  )
}

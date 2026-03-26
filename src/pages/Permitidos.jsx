import { useEffect, useState } from 'react'
import { usePointsStore } from '../stores/pointsStore'
import { DEFAULT_PERMITIDOS } from '../lib/constants'

function PermitidoCard({ item, balance, onRedeem }) {
  const canAfford = balance >= item.cost
  return (
    <div className={`bg-white rounded-2xl p-4 border flex items-center gap-4 ${canAfford ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
      <span className="text-3xl">{item.emoji}</span>
      <div className="flex-1">
        <div className="font-semibold text-gray-800">{item.name}</div>
        <div className="text-sm text-amber-600 font-bold">{item.cost} créditos</div>
      </div>
      <button
        onClick={() => onRedeem(item)}
        disabled={!canAfford}
        className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
          canAfford
            ? 'bg-amber-500 text-white active:scale-95'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        Canjear
      </button>
    </div>
  )
}

export default function Permitidos() {
  const { totalPoints, spentPoints, redeemHistory, streak, fetchAll, redeem, getLevel } = usePointsStore()
  const [justRedeemed, setJustRedeemed] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const balance = totalPoints - spentPoints
  const { current: level } = getLevel()

  const handleRedeem = async (item) => {
    try {
      await redeem(item)
      setJustRedeemed(item)
      setTimeout(() => setJustRedeemed(null), 2000)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Permitidos</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
        <div className="text-sm text-amber-100 mb-1">Tu balance</div>
        <div className="text-4xl font-bold">{balance} <span className="text-lg font-normal">créditos</span></div>
        <div className="flex gap-4 mt-3 text-sm text-amber-100">
          <span>Ganados: {totalPoints}</span>
          <span>Canjeados: {spentPoints}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span>{level.badge} {level.name}</span>
          {streak >= 7 && <span className="bg-amber-400/30 px-2 py-0.5 rounded-lg text-xs">🔥 x1.5 activo</span>}
        </div>
      </div>

      {/* Just redeemed feedback */}
      {justRedeemed && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center animate-pulse">
          <span className="text-2xl">{justRedeemed.emoji}</span>
          <div className="font-semibold text-green-700 mt-1">¡{justRedeemed.name} canjeado!</div>
          <div className="text-sm text-green-600">Disfrutalo 👊</div>
        </div>
      )}

      {/* Catalog */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Catálogo</h2>
        {DEFAULT_PERMITIDOS.map(item => (
          <PermitidoCard
            key={item.id}
            item={item}
            balance={balance}
            onRedeem={handleRedeem}
          />
        ))}
      </div>

      {/* History */}
      {redeemHistory.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Historial de canjes</h2>
          {redeemHistory.map(r => (
            <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-lg">{r.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">{r.item}</div>
                <div className="text-xs text-gray-400">
                  {new Date(r.redeemed_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="text-sm text-amber-600 font-semibold">-{r.cost}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

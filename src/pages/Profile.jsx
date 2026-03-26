import { useAuthStore } from '../stores/authStore'

export default function Profile() {
  const { session, signOut } = useAuthStore()

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Perfil</h1>

      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-violet-600">M</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">Mati Bodino</div>
            <div className="text-sm text-gray-500">{session?.user?.email}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Objetivos diarios</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Calorías</div>
            <div className="font-bold text-gray-900">2100 kcal</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Proteína</div>
            <div className="font-bold text-gray-900">150g</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Carbs</div>
            <div className="font-bold text-gray-900">210g</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Grasa</div>
            <div className="font-bold text-gray-900">70g</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Agua</div>
            <div className="font-bold text-gray-900">2.5L</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Pasos</div>
            <div className="font-bold text-gray-900">10,000</div>
          </div>
        </div>
        <p className="text-xs text-gray-400">Los objetivos se editan en Fase 3</p>
      </div>

      <button
        onClick={signOut}
        className="w-full py-3 text-red-500 font-semibold text-sm rounded-xl border border-red-200 active:bg-red-50 transition"
      >
        Cerrar sesión
      </button>
    </div>
  )
}

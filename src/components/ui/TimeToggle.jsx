import { hapticLight } from '../../lib/haptics'

export default function TimeToggle({ value, onChange, options = ['D', 'W', 'M'] }) {
  return (
    <div className="flex bg-white/5 rounded-full p-0.5 w-fit">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => { hapticLight(); onChange(opt) }}
          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
            value === opt ? 'bg-white/15 text-white' : 'text-gray-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

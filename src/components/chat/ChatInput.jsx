import { useState } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')

  const handleSend = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-white">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Preguntale a Brim..."
          disabled={disabled}
          rows={1}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-violet-500 resize-none disabled:opacity-50"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="px-4 py-3 bg-violet-600 text-white rounded-xl font-semibold active:scale-95 transition disabled:opacity-40"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

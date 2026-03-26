import { useState } from 'react'

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola Mati. Contame qué comiste o preguntame lo que necesites.' }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: input.trim() }])
    // TODO: Fase 2 — enviar a Edge Function
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Chat con Claude se activa en Fase 2. Por ahora solo veo tu mensaje: "' + input.trim() + '"'
    }])
    setInput('')
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Qué comiste hoy..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-3 bg-violet-600 text-white rounded-xl font-semibold active:scale-95 transition disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import ChatBubble from '../components/chat/ChatBubble'
import ChatInput from '../components/chat/ChatInput'

const QUICK_ACTIONS = [
  '¿Cómo vengo hoy?',
  '¿Qué debería comer?',
  'Mi semana',
  '¿Cuánta agua me falta?',
  'Dame una rutina corta',
]

export default function Chat() {
  const { messages, isStreaming, loaded, fetchHistory, sendMessage } = useChatStore()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!loaded) fetchHistory()
  }, [loaded])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text) => {
    sendMessage(text)
  }

  const handleNewChat = () => {
    if (messages.length === 0) return
    if (window.confirm('¿Iniciar chat nuevo? Se borra el historial.')) {
      useChatStore.getState().clearHistory()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] bg-[#0a0a0a] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">💬 Brim</h2>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="text-xs font-medium text-violet-600 active:text-violet-800 px-2 py-1 rounded-lg bg-violet-50"
          >
            + Nuevo chat
          </button>
        )}
      </div>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-3">💪</div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Hola, soy Brim</h2>
            <p className="text-sm text-gray-500 mb-6">
              Preguntame sobre tu progreso, comida, hábitos, o lo que necesites
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action}
                  onClick={() => handleSend(action)}
                  className="px-3 py-2 text-sm font-medium rounded-xl border border-violet-200 text-violet-600 active:bg-violet-50 transition"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble
                key={msg.id || i}
                role={msg.role}
                content={msg.content}
                time={msg.time}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}

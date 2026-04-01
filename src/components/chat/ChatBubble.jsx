export default function ChatBubble({ role, content, time, isStreaming }) {
  const isUser = role === 'user'

  // Simple markdown: **bold**, *italic*, - lists
  const renderContent = (text) => {
    if (!text) return isStreaming ? <span className="animate-pulse">●</span> : null
    return text.split('\n').map((line, i) => {
      let processed = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')

      if (line.startsWith('- ')) {
        processed = '• ' + processed.slice(2)
      }

      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: processed }} />
          {i < text.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }`}>
          {renderContent(content)}
        </div>
        {time && (
          <div className={`text-xs text-gray-300 mt-0.5 ${isUser ? 'text-right' : 'text-left'} px-1`}>
            {time}
          </div>
        )}
      </div>
    </div>
  )
}

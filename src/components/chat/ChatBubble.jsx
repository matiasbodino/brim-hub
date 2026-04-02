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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-2`}>
      <div className="max-w-[85%]">
        <div className={`p-4 rounded-[1.8rem] text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-violet-600 text-white rounded-tr-none'
            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
        }`}>
          {renderContent(content)}
        </div>
        {time && (
          <div className={`text-[10px] text-slate-300 mt-1 ${isUser ? 'text-right' : 'text-left'} px-2`}>
            {time}
          </div>
        )}
      </div>
    </div>
  )
}

import { forwardRef } from 'react'

const ShareCard = forwardRef(({
  score,
  streak,
  level,
  credits,
  cycleName,
  cycleWeek,
  habits,
  date,
}, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 390,
        padding: 24,
        background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1030 50%, #0d0620 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff',
        borderRadius: 20,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Brim Hub
        </div>
        <div style={{ fontSize: 14, color: '#71717a', marginTop: 2 }}>{date}</div>
      </div>

      {/* Score + Level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: score >= 80 ? '#7c3aed' : score >= 50 ? '#f59e0b' : '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{score}%</div>
        </div>
        <div>
          <div style={{ fontSize: 32 }}>{level.badge}</div>
          <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>{level.name}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{
          flex: 1, background: '#1e1535', borderRadius: 12, padding: '10px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{streak}</div>
          <div style={{ fontSize: 11, color: '#71717a' }}>racha 🔥</div>
        </div>
        <div style={{
          flex: 1, background: '#1e1535', borderRadius: 12, padding: '10px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{credits}</div>
          <div style={{ fontSize: 11, color: '#71717a' }}>créditos</div>
        </div>
      </div>

      {/* Habits */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Hábitos
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {habits.map((h, i) => (
            <div key={i} style={{
              flex: 1, background: h.done ? '#2e1065' : '#1e1535',
              border: h.done ? '1px solid #7c3aed' : '1px solid #27272a',
              borderRadius: 10, padding: '8px 4px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20 }}>{h.emoji}</div>
              <div style={{ fontSize: 10, color: h.done ? '#a78bfa' : '#52525b', marginTop: 2 }}>
                {h.done ? '✓' : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cycle (if active) */}
      {cycleName && (
        <div style={{
          background: '#1e1535', borderRadius: 10, padding: '8px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: '#a78bfa' }}>{cycleName}</div>
          <div style={{ fontSize: 11, color: '#52525b' }}>Semana {cycleWeek}/4</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#3f3f46', marginTop: 8 }}>
        brim-hub.vercel.app
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'
export default ShareCard

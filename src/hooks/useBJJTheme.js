import { useMemo } from 'react'
import { usePointsStore } from '../stores/pointsStore'
import { LEVELS } from '../lib/constants'

export function useBJJTheme() {
  const { totalPoints } = usePointsStore()

  const currentLevel = useMemo(() => {
    return [...LEVELS].reverse().find(l => totalPoints >= l.min) || LEVELS[0]
  }, [totalPoints])

  const themeConfig = {
    'Cinturón Blanco': { primary: '#f8fafc', text: '#334155', accent: '#e2e8f0', gradient: 'from-slate-100 to-slate-200' },
    'Cinturón Azul': { primary: '#2563eb', text: '#ffffff', accent: '#60a5fa', gradient: 'from-blue-600 to-blue-700' },
    'Cinturón Violeta': { primary: '#7c3aed', text: '#ffffff', accent: '#a78bfa', gradient: 'from-violet-600 to-violet-700' },
    'Cinturón Marrón': { primary: '#78350f', text: '#ffffff', accent: '#b45309', gradient: 'from-amber-900 to-stone-800' },
    'Cinturón Negro': { primary: '#18181b', text: '#ffffff', accent: '#52525b', gradient: 'from-zinc-900 to-black' },
  }

  return {
    levelName: currentLevel.name,
    badge: currentLevel.badge,
    colors: themeConfig[currentLevel.name],
  }
}

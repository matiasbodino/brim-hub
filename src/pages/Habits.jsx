// DEPRECATED: Habits.jsx → migrated to Activity.jsx
// This file redirects to /activity for any existing links
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Habits() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/activity', { replace: true }) }, [])
  return null
}

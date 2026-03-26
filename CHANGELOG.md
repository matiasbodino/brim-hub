# Changelog

## Unreleased

### Added
- **Points system**: habits earn credits (water 5, steps 10, BJJ 20, gym 15)
- **Perfect day bonus**: x2 points when all 4 habits completed
- **Streak multiplier**: x1.5 after 7+ consecutive perfect days
- **Levels**: Cinturón Blanco → Azul → Violeta → Marrón → Negro based on total points
- **Permitidos page**: balance card, redeem catalog (pizza, birra, helado, etc.), history
- **Progress page**: 28-day heatmap, weight trend chart, BJJ journal
- **BJJ mini-form**: Gi/No-Gi, duration, techniques, notes (stored as JSONB metadata)
- **Food logging**: manual form with meal type, description, kcal, protein
- **Weight input**: log weight from Profile, shows trend in Progress
- **5-tab nav**: Hoy, Hábitos, Permitidos, Progreso, Perfil
- **Constants file**: centralized targets, habits, points economy, levels

### Changed
- Dashboard: 3 summary cards (score, credits, streak) + level progress bar
- Habits page: shows points earned per habit, BJJ opens detailed form
- Profile: shows level/badge, weight input, targets from constants
- Stores: use MATI_ID from constants, timezone-aware date filtering

### Removed
- Login/auth requirement (personal app, direct access)
- Chat page (deferred to v2 with Claude API)

### Fixed
- Timezone bug in foodStore date filtering (now uses Argentina UTC-3)
- Error handling in habitStore and foodStore (was silently swallowing errors)

## v0.1.0 — 2026-03-26

### Added
- Initial setup: Vite + React + Tailwind + Zustand + Supabase
- PWA support (installable on iPhone)
- Dashboard with daily score, macros, habits checklist
- Basic habit tracking (water, steps, BJJ, gym toggles)
- Chat page placeholder
- Profile with hardcoded targets
- Supabase schema: user_profile, food_logs, habit_logs, weight_logs, streaks, chat_messages, gym_routines
- Deploy on Vercel (brim-hub.vercel.app)

# Changelog

## Unreleased

### Added
- **Onboarding**: First-time setup flow, gates Dashboard via localStorage + custom event
- **Walk tracker**: Calorie mission, live stats, nasal breathing check (/walk)
- **Breathe**: Guided breathing with 3 techniques, up to 20 min (/breathe)
- **BJJ Session**: Post-session strain score + recovery suggestion (/bjj-session)
- **Workout**: Guided gym sessions with timer, sets, RPE tracking (/workout)
- **Command Bar**: Global Cmd+K spotlight with NL intent via `parse-intent` Edge Function
- **Quick Actions**: FAB grid for rapid navigation
- **Chef Bio-Analítico**: Smart meal suggestion from remaining macros + active burn context
- **Damage Control**: "Me pasé" flow — spreads calorie excess over 3-5 recovery days
- **Active Burn Engine**: MET-based calorie estimation from logged activities
- **Vitality Ring**: Holistic wellness score visualization
- **Status Rings + Macro Arcs**: Dashboard ring indicators
- **Predictive Ghost**: Predictive suggestions component
- **Monthly Report**: Component + Edge Function for monthly summaries
- **Streak Shield**: Functional permitido (100 créditos) that protects streak
- **Water units**: Effective hydration (mate = 700ml effective, caffeine discount)
- **Daily reset hook**: Midnight + app resume detection, refetches all stores
- **Background sync**: useSync hook for rehydrate + flush
- **Animated values**: useAnimatedValue hook for number transitions
- **Gym charts**: GymCharts component for workout analytics
- **AI gym routines**: generate-routine Edge Function
- **Confetti**: canvas-confetti for celebrations
- New stores: damageStore, reportStore, routineStore
- New Edge Functions: chef-suggest, parse-intent, generate-routine, monthly-email

### Changed
- **Dashboard**: Read-only hub — all interaction moved to /habits (Diario)
- **BottomNav**: Dark mode (bg-[#0a0a0a]), tabs renamed (Home, Diario), hidden on activity pages
- **Habits page**: Dark mode, "Repetir última" quick-log, tabs Actividad/Nutrición
- **Progress**: Dark heatmap, 6-pillar radar chart, baseline, trophies
- **Daily Plan**: Regenerative — updates on every food log, Chef Bio-Analítico integration
- **Dashboard macro display**: Calorie wallet with time-aware intake windows + "Target Ahora"
- **pointsStore**: Added shields support for streak protection
- **constants.js**: Added WATER_UNITS, SHIELD_COST, streak_shield permitido

### Fixed
- Onboarding gate re-evaluates after completion (no page refresh needed)
- Capped per-meal calories to prevent monster portions in daily plan
- DailyPlan toggle — entire header zone clickable to collapse

## v0.6.0 — AI Insights + Daily Game Plan

### Added
- **AI Insights Engine**: 90-day pattern analysis → user_insights + user_model
- **Daily Game Plan**: Proactive daily targets adjusted by weekly progress toward weight goal
- **Insights frontend**: insightsStore, InsightCard, section in Progress
- **DailyPlan component**: Morning brief, midday adjust, evening wrap, meal suggestions with "Loggear esto"
- **planStore + insightsStore**: New Zustand stores
- Tables: user_insights, user_model, daily_plans
- Edge Functions: generate-insights, daily-plan
- Weight goal fields on user_profile

### Changed
- Context builder: Now includes user_model + top insights in every Claude call
- Chat + digest: Enriched with personalized user context

## v0.5.0 — Premium Redesign

### Added
- BJJ theme hook (useBJJTheme): Dynamic colors by belt level
- Bento grid Dashboard, MacroRings (SVG), gradient cards
- Energy picker colors, premium BottomSheet

### Changed
- Dashboard: Bento layout, HabitRow with identity messages
- ChatBubble: Asymmetric corners, premium spacing
- WeeklyDigest: Dark gradient, animated chevron
- CycleCard: Semáforo traffic lights
- TrendCharts: Gradient fills

## v0.4.0 — AI Layer

### Added
- AI Food Parsing (parse-food Edge Function)
- AI Coach Chat (chat Edge Function, streaming)
- Weekly AI Digest (weekly-digest Edge Function)
- FoodEstimateCard, ChatBubble, ChatInput, WeeklyDigest components
- chatStore, digestStore
- Edge Functions shared: anthropic.ts, context.ts

### Changed
- BottomNav: Replaced Permitidos tab with Brim (Chat)
- Food logging: AI mode as default

## v0.3.0 — Engagement Features

### Added
- Micro-journal + mood picker
- Analytics events (track())
- Toast notifications, haptic feedback
- Skeleton loaders, trend charts (Recharts)
- journalStore, energyStore, gymPrStore

## v0.2.0 — Gamification + Cycles

### Added
- Points system, perfect day bonus, streak multiplier
- Levels (Cinturón Blanco → Negro)
- Permitidos marketplace
- 4-week cycles with traffic light KPIs
- Progress page: heatmap, weight trend, BJJ journal
- BJJ form (Gi/No-Gi, duration, techniques, notes)
- Food logging (manual), weight input
- cycleStore, targetsStore

## v0.1.0 — 2026-03-26

### Added
- Initial setup: Vite + React + Tailwind + Zustand + Supabase
- PWA support, Dashboard, basic habit tracking
- Deploy on Vercel (brim-hub.vercel.app)

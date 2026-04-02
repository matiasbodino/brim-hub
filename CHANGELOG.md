# Changelog

## Unreleased

### Added
- **AI Insights Engine**: Edge Function analyzes 90 days of data, discovers patterns (correlations, food preferences, behavior, trends, motivation), saves to `user_insights` + generates `user_model` narrative profile
- **Daily Game Plan**: Proactive daily targets adjusted by weekly progress toward weight goal. Claude suggests meals based on actual user preferences. 3 touchpoints: morning brief, midday recalc, evening wrap
- **Insights frontend**: insightsStore, InsightCard component, insights section in Progress page with generate/dismiss/confidence display
- **Dashboard AI indicator**: "AI actualizada" banner linking to insights
- **planStore**: Zustand store for daily plan fetch/generate/recalculate
- **Daily plans table**: `daily_plans` with adjusted targets, meal suggestions, consumed tracking, AI narratives
- **User insights tables**: `user_insights` (pattern storage) + `user_model` (narrative profile)
- **Weight goal fields**: `weight_goal`, `weight_goal_date`, `weekly_weight_target` on user_profile
- **SQL migrations**: `001_insights_tables.sql`, `002_daily_plans.sql`

### Changed
- **Context builder** (`_shared/context.ts`): Now includes user_model + top insights in every Claude call
- **Chat system prompt**: Enriched with user_model + active insights for personalized responses
- **Weekly digest**: Uses user_model for pattern-aware summaries
- **generate-insights model**: Fixed to use `claude-sonnet-4-20250514`

## v0.5.0 — Premium Redesign

### Added
- **BJJ theme hook** (`useBJJTheme`): Dynamic colors based on current belt level
- **Bento grid Dashboard**: Score card with belt display, gradient credit/streak cards
- **Impact summary**: "Never miss twice" streak logic display
- **Macro rings**: Circular SVG progress indicators replacing bars
- **Energy picker colors**: Per-level color coding with haptic feedback
- **Premium BottomSheet**: Themed, rounded-3xl, overlay dismiss
- **Habits tabs**: Actividad/Nutrición split view
- **FoodLogger redesign**: Premium card layout with AI/Manual toggle

### Changed
- Dashboard: Full bento layout, HabitRow with identity messages, collapsible completed habits
- ChatBubble: Asymmetric corners, white assistant bg, premium spacing
- WeeklyDigest: Dark gradient card, animated chevron, pill insights
- CycleCard: Semáforo display with traffic lights per habit per week
- Permitidos: Grid layout redesign
- TrendCharts: Gradient fills

## v0.4.0 — AI Layer

### Added
- **AI Food Parsing**: Edge Function `parse-food` with Argentine food specialist prompt, confidence scoring, breakdown
- **AI Coach Chat**: Edge Function `chat` with streaming, full user context, "Brim" personality
- **Weekly AI Digest**: Edge Function `weekly-digest` with narrative summary + KPIs
- **FoodEstimateCard**: AI estimate display with confirm/edit/retry
- **ChatBubble + ChatInput**: Full chat UI components
- **WeeklyDigest component**: Collapsible digest card in Dashboard
- **chatStore**: Messages, sendMessage, fetchHistory
- **digestStore**: Fetch/generate weekly digest
- **Edge Functions shared**: `_shared/anthropic.ts` (Claude client), `_shared/context.ts` (user context builder)
- **Health endpoint**: Test Edge Function

### Changed
- BottomNav: Replaced Permitidos tab with Brim (Chat) tab
- Food logging: AI mode as default, manual as fallback
- Dashboard: Added WeeklyDigest section

## v0.3.0 — Engagement Features

### Added
- **Micro-journal**: Daily one-line entry + mood picker (5 emojis), auto-save
- **Analytics events**: `track()` function logging to `app_events` table
- **Toast notifications**: Auto-dismiss feedback on actions
- **Haptic feedback**: vibrate on habit completion, perfect day, redeem
- **Skeleton loaders**: Loading placeholders for all pages
- **Trend charts**: Weight line, habits bar, macros line (Recharts)
- **Minus buttons**: Undo water/steps increments
- **Delete food logs**: Remove entries from Dashboard
- **journalStore, energyStore, gymPrStore**: New Zustand stores

### Changed
- Habits: Collapsible completed habits, BJJ bottom sheet, food list, energy picker
- Dashboard: Show all today's meals with delete
- MicroJournal: Explicit save button, edit hint, Enter to save

## v0.2.0 — Gamification + Cycles

### Added
- **Points system**: Habits earn credits (water 5, steps 10, BJJ 20, gym 15)
- **Perfect day bonus**: x2 when all 4 habits completed
- **Streak multiplier**: x1.5 after 7+ consecutive days ("never miss twice" logic)
- **Levels**: Cinturón Blanco → Azul → Violeta → Marrón → Negro
- **Permitidos**: Balance card, redeem catalog, history
- **4-week cycles**: Create cycles with per-habit weekly targets, traffic light KPIs
- **Progress page**: 28-day heatmap, weight trend, BJJ journal, gym PRs
- **BJJ form**: Gi/No-Gi, duration, techniques, notes (JSONB metadata)
- **Food logging**: Manual form with meal type, description, kcal, protein
- **Weight input**: Log from Profile, trend in Progress
- **Editable targets**: Profile page with save to user_profile
- **cycleStore, targetsStore**: New Zustand stores

### Changed
- Dashboard: 3 summary cards (score, credits, streak) + level progress bar
- Profile: Level badge, targets grid

### Removed
- Auth requirement (personal app, direct access)

### Fixed
- Timezone bug in foodStore (now Argentina UTC-3)

## v0.1.0 — 2026-03-26

### Added
- Initial setup: Vite + React + Tailwind + Zustand + Supabase
- PWA support (installable)
- Dashboard with daily score, macros, habits
- Basic habit tracking (water, steps, BJJ, gym)
- Profile with hardcoded targets
- Supabase schema: core tables
- Deploy on Vercel (brim-hub.vercel.app)

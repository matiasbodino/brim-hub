# Brim Hub — Context Document

## What is this
Personal wellness PWA for Mati Bodino. "BioHacker OS" — gamified habit tracking, AI-powered nutrition, guided workouts/walks/breathing, BJJ journal, daily game plan with adaptive targets, AI coach chat, pattern analysis, and points economy with BJJ belt levels. Mobile-first dark mode, single user, no auth.

## Stack
- **Framework:** Vite 8 + React 19
- **Styling:** Tailwind CSS 4.2 (dark mode throughout)
- **State:** Zustand 5 (16 stores)
- **Backend:** Supabase (Postgres + Edge Functions + RLS open)
- **AI:** Anthropic Claude (claude-sonnet-4-5) via 10 Edge Functions
- **Charts:** Recharts 3
- **PWA:** vite-plugin-pwa (installable, custom app icon)
- **Deploy:** Vercel (brim-hub.vercel.app)
- **Routing:** react-router-dom v7
- **Other:** html2canvas (share PNG), canvas-confetti (celebrations)

## Architecture

```
PWA (Vite + React + Tailwind — dark mode)
├── /           → Dashboard (read-only hub: vitality ring, macros, plan, habits, journal)
├── /habits     → Diario: all interaction (logging, food, energy, weight, daily plan, journal)
├── /chat       → AI coach "Brim" (context-aware, streaming)
├── /workout    → Guided gym sessions (timer, sets, RPE)
├── /walk       → Walk tracker (calorie mission, nasal breathing check)
├── /breathe    → Guided breathing (3 techniques, up to 20min)
├── /bjj-session → BJJ post-session (strain score, recovery suggestion)
├── /permitidos → Points marketplace (via Dashboard credit card tap)
├── /progress   → Analytics (dark heatmap, 6-pillar radar, trends, PRs, insights)
├── /profile    → Level, targets, weight goal
├── /checkin    → Sunday weekly check-in
└── /onboarding → First-time setup (gates Dashboard via localStorage)
        │
        ▼
   Supabase (birpqzahbtfbxxtaqeth)
   ├── 18+ tables (see DB Schema below)
        │
        ▼
   Edge Functions (Deno + Anthropic SDK)
   ├── _shared/          → anthropic.ts (callClaude), context.ts (buildUserContext + user_model + insights)
   ├── parse-food        → AI food macro estimation (Argentine food specialist)
   ├── parse-intent      → Natural language intent detection for CommandBar
   ├── chef-suggest      → Smart meal suggestion based on remaining macros + active burn
   ├── chat              → AI coach with full user context
   ├── weekly-digest     → Weekly narrative summary with KPIs
   ├── monthly-email     → Monthly report generation
   ├── generate-insights → 90-day pattern analysis → user_insights + user_model
   ├── generate-routine  → AI gym routine generation
   ├── daily-plan        → Proactive daily targets + meal suggestions (regenerates on every food log)
   └── health            → Test endpoint
```

## Key Patterns

### No Auth
Single user. MATI_ID hardcoded in constants.js. All RLS = `USING (true)`.

### Constants-driven
All targets, habits, points, levels, permitidos, water units, gym exercises in `src/lib/constants.js`.

### Dark Mode
BottomNav and many components use dark theme (bg-[#0a0a0a], slate-900, etc.). Dashboard is mixed light/dark.

### Onboarding Gate
App.jsx checks `localStorage.getItem('brim_onboarded')`. If not set, shows Onboarding page instead of Dashboard. On completion, dispatches `'onboarding-complete'` custom event → App re-renders to Dashboard without page refresh.

### Daily Reset
`useDailyReset` hook checks date change at midnight + on app resume. Refetches all stores when day changes.

### Background Sync
`useSync` hook rehydrates from Supabase and flushes pending writes on mount.

### Points Economy
- Habit points: water 5, steps 10, gym 15, bjj 20
- Perfect day (all 4 habits): x2 bonus
- 7+ day streak: x1.5 multiplier
- "Never miss twice" streak logic
- Streak Shield: functional permitido (100 créditos) that protects streak
- Balance = totalPoints - spentPoints → spend on permitidos

### Levels (BJJ Belt System)
| Level | Min Points | Badge |
|-------|-----------|-------|
| Cinturón Blanco | 0 | 🤍 |
| Cinturón Azul | 500 | 💙 |
| Cinturón Violeta | 1500 | 💜 |
| Cinturón Marrón | 3500 | 🤎 |
| Cinturón Negro | 7000 | 🖤 |

### AI System (3 Layers)

**Layer 1: Raw Data** — All logs in Supabase tables.

**Layer 2: Pattern Engine** — `generate-insights` runs weekly:
- 90-day data analysis → stats calculated in code
- Claude generates structured insights (correlations, food prefs, behavior, trends, motivation)
- Saves to `user_insights` + generates narrative `user_model`

**Layer 3: Enriched Context** — Every Claude call includes:
- user_model (~500-word narrative profile)
- Top 10 active insights
- Fresh today/week data

### Daily Game Plan (Proactive)
- `daily-plan` Edge Function calculates adjusted daily calorie targets based on weekly progress vs weight goal
- Guardrails: floor 1400 kcal, ceiling base+200, compensate with extra steps
- Claude suggests meals based on actual food preferences
- Regenerates on every food log (`regenerative` pattern)
- Chef Bio-Analítico: smart meal suggestion considering remaining macros + active burn context
- 3 touchpoints: morning brief, midday recalc, evening wrap

### Active Burn Engine
`src/lib/activeBurn.js` — MET-based calorie estimation from logged activities (gym, BJJ, walk, steps). Feeds into Dashboard calorie ring and chef-suggest context.

### Damage Control
`DamageControl` component + `damageStore` — "Me pasé" flow that spreads calorie excess over 3-5 recovery days.

### Water Units
Effective hydration tracking: vaso (250ml), botella (500ml), termo (1L), mate (700ml effective — caffeine discounts).

### Command Bar
Global Cmd+K spotlight (CommandBar.jsx) with natural language intent via `parse-intent` Edge Function.

## File Structure

```
src/
├── App.jsx                              # Router (12 routes), onboarding gate, CommandBar, QuickActions, SyncIndicator
├── main.jsx
├── index.css
├── components/
│   ├── BottomNav.jsx                    # 5 tabs: Home, Diario, Brim, Progreso, Perfil (dark, hidden on activity pages)
│   ├── ShareButton.jsx                  # Export to PNG
│   ├── ShareCard.jsx                    # Shareable card template
│   ├── Skeleton.jsx                     # Loading placeholders
│   ├── Toast.jsx                        # Notification system
│   ├── charts/
│   │   ├── TrendCharts.jsx             # Weight, habits, macros (Recharts, gradients)
│   │   └── GymCharts.jsx              # Gym-specific charts
│   ├── chat/
│   │   ├── ChatBubble.jsx             # User/assistant bubbles
│   │   ├── ChatInput.jsx             # Chat input + send
│   │   └── FoodEstimateCard.jsx       # AI food estimate display
│   ├── dashboard/
│   │   ├── StatusRings.jsx            # Habit status ring indicators
│   │   └── MacroArcs.jsx             # Macro arc visualizations
│   ├── digest/WeeklyDigest.jsx         # Weekly AI summary card
│   ├── journal/MicroJournal.jsx        # Daily journal + mood
│   ├── plan/
│   │   ├── DailyPlan.jsx             # Proactive plan with meal slots + chef suggest
│   │   ├── DamageControl.jsx          # "Me pasé" recovery spreader
│   │   ├── PredictiveGhost.jsx        # Predictive suggestions
│   │   └── VitalityRing.jsx          # Vitality score ring
│   ├── report/MonthlyReport.jsx        # Monthly report card
│   └── ui/
│       ├── BottomSheet.jsx            # Modal from bottom
│       ├── CommandBar.jsx             # Cmd+K spotlight
│       ├── QuickActions.jsx           # Quick action grid + FAB
│       └── SyncIndicator.jsx          # Background sync status
├── pages/
│   ├── Dashboard.jsx     (475 lines)   # Read-only hub: vitality, macros, plan preview, habits, food
│   ├── Habits.jsx        (993 lines)   # All interaction: energy, weight, habits, food AI/manual, plan, journal
│   ├── Progress.jsx      (993 lines)   # Dark heatmap, 6-pillar radar, trends, PRs, insights, cycles, BJJ journal
│   ├── Workout.jsx       (453 lines)   # Guided gym session (timer, sets, RPE tracking)
│   ├── Profile.jsx       (239 lines)   # Level, targets, weight goal
│   ├── Walk.jsx          (219 lines)   # Walk tracker with calorie mission + nasal breathing
│   ├── BJJSession.jsx    (182 lines)   # Post-BJJ strain score + recovery suggestion
│   ├── Breathe.jsx       (184 lines)   # Guided breathing (3 techniques, up to 20min)
│   ├── Onboarding.jsx    (177 lines)   # First-time setup
│   ├── Checkin.jsx       (144 lines)   # Sunday check-in
│   ├── Permitidos.jsx    (132 lines)   # Points marketplace
│   ├── Chat.jsx          (94 lines)    # AI coach
│   └── Login.jsx         (72 lines)    # UNUSED
├── stores/ (16 stores)
│   ├── pointsStore.js    (294 lines)   # Points engine: award, streak, shields, perfectDay, redeem, levels
│   ├── foodStore.js      (207 lines)   # CRUD + parseWithAI, confirmAIEstimate, getTodayMacros
│   ├── cycleStore.js     (180 lines)   # 4-week cycles + weekly stats + semáforos
│   ├── reportStore.js    (114 lines)   # Monthly reports
│   ├── digestStore.js    (111 lines)   # Weekly digest
│   ├── chatStore.js      (106 lines)   # Chat messages + sendMessage
│   ├── damageStore.js    (90 lines)    # Damage control recovery plans
│   ├── habitStore.js     (89 lines)    # fetchToday, upsertHabit
│   ├── insightsStore.js  (72 lines)    # AI insights + user model
│   ├── planStore.js      (67 lines)    # Daily plan fetch/generate/recalculate
│   ├── targetsStore.js   (63 lines)    # Fetch/update targets
│   ├── gymPrStore.js     (63 lines)    # Gym PR tracking
│   ├── journalStore.js   (46 lines)    # Micro-journal
│   ├── energyStore.js    (41 lines)    # Daily energy level
│   ├── routineStore.js   (33 lines)    # AI gym routines
│   └── authStore.js      (31 lines)    # UNUSED
├── hooks/
│   ├── useSync.js                      # Background rehydrate + flush
│   ├── useDailyReset.js               # Midnight + app resume date check
│   ├── useBJJTheme.js                 # Dynamic colors by belt level
│   └── useAnimatedValue.js            # Animated number transitions
└── lib/
    ├── constants.js                    # MATI_ID, TARGETS, HABITS, POINTS, LEVELS, PERMITIDOS, WATER_UNITS, GYM_EXERCISES
    ├── supabase.js                     # Supabase client
    ├── analytics.js                    # track() → app_events
    ├── haptics.js                      # Haptic feedback helpers
    └── activeBurn.js                   # MET-based calorie burn estimation
```

## Edge Functions (10 + shared)
```
supabase/functions/
├── _shared/
│   ├── anthropic.ts      (93 lines)   # callClaude() helper
│   └── context.ts        (218 lines)  # buildUserContext() with user_model + insights
├── daily-plan/           (465 lines)  # Adaptive targets + meal suggestions + narratives
├── generate-insights/    (438 lines)  # 90-day pattern analysis → insights + user model
├── weekly-digest/        (217 lines)  # Weekly narrative summary
├── generate-routine/     (197 lines)  # AI gym routine generation
├── chef-suggest/         (157 lines)  # Smart meal from remaining macros + burn context
├── monthly-email/        (156 lines)  # Monthly report
├── parse-food/           (128 lines)  # AI food macro estimation
├── chat/                 (121 lines)  # AI coach with full context
├── parse-intent/         (116 lines)  # NL intent for CommandBar
└── health/               (56 lines)   # Test endpoint
```

## DB Schema

```sql
habit_logs        (id, user_id, date, habit_type, value, target, completion_type, metadata JSONB, created_at)
                  UNIQUE(user_id, date, habit_type)
food_logs         (id, user_id, logged_at, meal_type, description, calories, protein, carbs, fat, confirmed)
weight_logs       (id, user_id, date, weight, notes)  UNIQUE(user_id, date)
energy_logs       (id, user_id, date, level, created_at)  UNIQUE(user_id, date)
points_log        (id, user_id, date, source, points, multiplier, created_at)
redeems           (id, user_id, item, emoji, cost, redeemed_at)
cycles            (id, user_id, name, start_date, end_date, status, targets JSONB, reflection, created_at)
cycle_weekly_stats (id, cycle_id, week_number, stats JSONB, created_at)
journal_entries   (id, user_id, date, content, mood, created_at)  UNIQUE(user_id, date)
gym_prs           (id, user_id, exercise, weight, reps, date, notes, created_at)
chat_messages     (id, user_id, role, content, metadata JSONB, created_at)
ai_food_estimates (id, user_id, food_log_id, raw_input, ai_estimate JSONB, user_confirmed, user_override JSONB, model, created_at)
weekly_digests    (id, user_id, week_start, week_end, digest_content, habits_summary JSONB, insights JSONB, created_at)
                  UNIQUE(user_id, week_start)
daily_plans       (id, user_id, date, plan_version, adjusted_targets JSONB, meal_suggestions JSONB, consumed_so_far JSONB, remaining_budget JSONB, week_progress JSONB, morning_brief, midday_adjust, evening_wrap, generated_at)
                  UNIQUE(user_id, date)
user_insights     (id, user_id, insight_type, insight_key, insight_value JSONB, confidence, evidence_count, first_seen, last_updated, active)
                  UNIQUE(user_id, insight_type, insight_key)
user_model        (id, user_id, model_version, model_content, token_count, generated_at)
user_profile      (id, display_name, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_steps_target, weekly_bjj_target, weekly_gym_target, weight_goal, weight_goal_date, weekly_weight_target)
app_events        (id, user_id, event_type, metadata JSONB, created_at)
gym_routines      (id, user_id, name, focus, exercises JSONB, duration_min)
streaks           (id, user_id, habit_type, current_streak, best_streak, last_completed)
```

## Supabase Config
- **Project:** birpqzahbtfbxxtaqeth.supabase.co
- **Edge Functions:** https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1/
- **RLS:** All open
- **Secret:** ANTHROPIC_API_KEY
- **Model:** claude-sonnet-4-5

## Navigation
- BottomNav (dark): Home, Diario, Brim, Progreso, Perfil
- Hidden on activity pages: /workout, /walk, /bjj-session, /breathe, /checkin
- /permitidos: via Dashboard credit card tap
- QuickActions: FAB with grid of quick actions
- CommandBar: Cmd+K spotlight with NL intent

## Dev Commands
```bash
npm run dev     # Vite dev server (port 5173)
npm run build   # Production build
npm run preview # Preview production build
```

## Conventions
- Spanish user-facing text, English code/comments
- No auth — MATI_ID hardcoded
- Timezone: Argentina UTC-3
- Mobile-first: max-w-lg
- Dark mode: BottomNav, activity pages, heatmap
- Primary color: violet-600 (blue-400 in dark contexts)
- Haptic feedback + confetti on celebrations
- Toast notifications for feedback
- BJJ theme: dynamic colors by belt (useBJJTheme)

## Codebase Size
- ~9,300 lines frontend (pages + stores + components + hooks + lib)
- ~2,400 lines Edge Functions
- Total: ~11,700 lines

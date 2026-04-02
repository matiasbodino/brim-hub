# Brim Hub — Context Document

## What is this
Personal wellness PWA for Mati Bodino. Habit tracking, AI-powered food logging, gamified points economy with BJJ belt levels, redeemable "permitidos" (treats), 4-week cycles with weekly KPIs, AI coach chat, weekly digest, daily game plan, micro-journal, gym PRs, and progress analytics. Mobile-first, single user, no auth.

## Stack
- **Framework:** Vite 8 + React 19
- **Styling:** Tailwind CSS 4.2
- **State:** Zustand 5
- **Backend:** Supabase (Postgres + Edge Functions + RLS open)
- **AI:** Anthropic Claude (claude-sonnet-4-5) via Supabase Edge Functions
- **Charts:** Recharts 3
- **PWA:** vite-plugin-pwa
- **Deploy:** Vercel (brim-hub.vercel.app)
- **Routing:** react-router-dom v7
- **Other:** html2canvas (share to PNG)

## Architecture

```
PWA (Vite + React + Tailwind)
├── /           → Dashboard (score, créditos, streak, nivel, macros, plan, digest, journal)
├── /habits     → Habit trackers + BJJ form + food log (AI + manual)
├── /chat       → AI coach "Brim" (streaming chat with full user context)
├── /permitidos → Points balance + redeem catalog + history (accessible via Dashboard credit card)
├── /progress   → Heatmap + cycles + trends + gym PRs + journal + BJJ journal + AI insights
├── /profile    → Level, weight input, editable targets, weight goal
└── /checkin    → Sunday weekly check-in (weight + reflection)
        │
        ▼
   Supabase (birpqzahbtfbxxtaqeth)
   ├── habit_logs       (daily habits + BJJ metadata JSONB)
   ├── food_logs        (food entries, manual or AI-confirmed)
   ├── weight_logs      (weight entries)
   ├── points_log       (earned points per habit)
   ├── redeems          (permitido redemptions)
   ├── energy_logs      (daily energy level 1-5)
   ├── journal_entries  (micro-journal + mood)
   ├── gym_prs          (personal records per exercise)
   ├── cycles           (4-week goal cycles)
   ├── cycle_weekly_stats (weekly KPI stats per cycle)
   ├── chat_messages    (AI coach conversation history)
   ├── ai_food_estimates (AI food parsing audit trail)
   ├── weekly_digests   (AI weekly summaries)
   ├── daily_plans      (AI daily game plan with adjusted targets)
   ├── user_insights    (AI-discovered patterns and correlations)
   ├── user_model       (AI-generated user profile narrative)
   ├── user_profile     (targets + weight goal)
   ├── app_events       (analytics events)
   └── gym_routines     (reserved)
        │
        ▼
   Edge Functions (Deno + Anthropic SDK)
   ├── _shared/anthropic.ts  → callClaude() helper
   ├── _shared/context.ts    → buildUserContext() with insights + user_model
   ├── parse-food            → AI food macro estimation (Argentine food specialist)
   ├── chat                  → AI coach with full user context
   ├── weekly-digest         → Weekly narrative summary with KPIs
   ├── generate-insights     → 90-day pattern analysis → user_insights + user_model
   ├── daily-plan            → Proactive daily targets + meal suggestions
   └── health                → Test endpoint
```

## Key Patterns

### No Auth
Single user app. User ID hardcoded as `MATI_ID` in `src/lib/constants.js`.
All RLS policies are `USING (true)`.

### Constants-driven
All targets, habits, points economy, levels, and permitidos catalog in `src/lib/constants.js`.

### Points Economy
- Habit points: water 5, steps 10, gym 15, bjj 20
- Perfect day (all 4 habits): x2 bonus
- 7+ day streak: x1.5 multiplier
- Streak logic: "never miss twice" — 1+ full OR 2+ partial counts as valid day
- Points accumulate → levels (Cinturón Blanco → Negro)
- Balance = totalPoints - spentPoints → spend on permitidos

### Levels
| Level | Min Points | Badge |
|-------|-----------|-------|
| Cinturón Blanco | 0 | 🤍 |
| Cinturón Azul | 500 | 💙 |
| Cinturón Violeta | 1500 | 💜 |
| Cinturón Marrón | 3500 | 🤎 |
| Cinturón Negro | 7000 | 🖤 |

### AI System (3 layers)

**Layer 1: Raw Data** — All habit/food/weight/energy logs in Supabase tables.

**Layer 2: Pattern Engine** — `generate-insights` Edge Function runs weekly:
- Queries 90 days of data, calculates stats in code (completion rates by day/energy, food frequencies, weight trend, streak patterns)
- Sends stats to Claude → generates structured insights (correlations, preferences, trends, motivation patterns)
- Saves to `user_insights` table + generates narrative `user_model`

**Layer 3: Enriched Context** — Every Claude call (chat, digest, daily-plan) includes:
- `user_model` (500-word narrative profile)
- Top 10 active insights
- Fresh today/week data

### Daily Game Plan
- `daily-plan` Edge Function calculates adjusted daily calorie targets based on weekly progress vs weight goal
- Guardrails: floor 1400 kcal, ceiling base+200, compensate with extra steps if needed
- Claude generates meal suggestions using user's actual food preferences
- 3 daily touchpoints: morning brief, midday recalc, evening wrap

### BJJ Tracking
BJJ sessions stored as `metadata` JSONB in `habit_logs`: type (Gi/No-Gi), duration, techniques, notes.

### Food Logging
Dual mode: AI (text → Claude estimates macros) or Manual (form with kcal/protein/carbs/fat).
AI estimates saved with confidence level and breakdown in `ai_food_estimates`.

### 4-Week Cycles
Goal periods with per-habit weekly targets. Weekly KPI traffic lights: 🟢 ≥80%, 🟡 ≥50%, 🔴 <50%.

## File Structure

```
src/
├── App.jsx                         # Router: 7 routes, ToastProvider wrapper
├── main.jsx                        # React entry
├── index.css                       # Tailwind imports
├── components/
│   ├── BottomNav.jsx               # 5 tabs: Hoy, Hábitos, Brim, Progreso, Perfil
│   ├── ShareButton.jsx             # Export to PNG trigger
│   ├── ShareCard.jsx               # Shareable card template
│   ├── Skeleton.jsx                # Loading placeholders
│   ├── Toast.jsx                   # Toast notification system
│   ├── charts/TrendCharts.jsx      # Weight, habits, macros charts (Recharts)
│   ├── chat/ChatBubble.jsx         # User/assistant message bubbles
│   ├── chat/ChatInput.jsx          # Chat text input + send
│   ├── chat/FoodEstimateCard.jsx   # AI food estimate display
│   ├── digest/WeeklyDigest.jsx     # Weekly AI summary card
│   ├── journal/MicroJournal.jsx    # Daily one-line journal + mood
│   └── ui/BottomSheet.jsx          # Reusable bottom sheet modal
├── pages/
│   ├── Dashboard.jsx               # Bento grid: score, credits, streak, macros, plan, digest, habits
│   ├── Habits.jsx                  # Energy + weight + habits + food (AI/manual) + food list
│   ├── Chat.jsx                    # AI coach conversation
│   ├── Permitidos.jsx              # Points marketplace + redeem history
│   ├── Progress.jsx                # Cycles, heatmap, trends, PRs, journal, BJJ journal, insights
│   ├── Profile.jsx                 # Level, weight, editable targets
│   ├── Checkin.jsx                 # Sunday check-in form
│   └── Login.jsx                   # UNUSED
├── stores/
│   ├── habitStore.js               # fetchToday, upsertHabit
│   ├── foodStore.js                # CRUD + parseWithAI, confirmAIEstimate, getTodayMacros
│   ├── pointsStore.js              # Points engine: award, streak, perfectDay, redeem, levels
│   ├── cycleStore.js               # 4-week cycles + weekly stats
│   ├── targetsStore.js             # Fetch/update user targets
│   ├── energyStore.js              # Daily energy level
│   ├── chatStore.js                # Chat messages + sendMessage
│   ├── digestStore.js              # Weekly digest fetch/generate
│   ├── journalStore.js             # Micro-journal CRUD
│   ├── gymPrStore.js               # Gym PR tracking
│   ├── insightsStore.js            # AI insights + user model
│   ├── planStore.js                # Daily game plan fetch/generate/recalculate
│   └── authStore.js                # UNUSED
├── hooks/
│   └── useBJJTheme.js              # Dynamic theme colors based on belt level
└── lib/
    ├── constants.js                # MATI_ID, TARGETS, HABITS, POINTS, LEVELS, PERMITIDOS
    ├── supabase.js                 # Supabase client
    ├── analytics.js                # track() function → app_events table
    └── haptics.js                  # Haptic feedback helpers
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
- **RLS:** All tables open (`USING (true)`)
- **Auth:** Not used
- **AI Model:** claude-sonnet-4-5 (via ANTHROPIC_API_KEY secret)

## Edge Functions
```bash
supabase functions deploy parse-food
supabase functions deploy chat
supabase functions deploy weekly-digest
supabase functions deploy generate-insights
supabase functions deploy daily-plan
supabase functions deploy health
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Navigation
- BottomNav: 5 tabs (Hoy, Hábitos, Brim, Progreso, Perfil)
- /permitidos accessible via credit card tap in Dashboard (no dedicated tab)
- /checkin accessible via Sunday banner in Dashboard

## Dev Commands
```bash
npm run dev     # Vite dev server (port 5173)
npm run build   # Production build
npm run preview # Preview production build
```

## Conventions
- Spanish for user-facing text, English for code/comments
- No auth — MATI_ID hardcoded everywhere
- Timezone: Argentina UTC-3 for date filtering
- Mobile-first: max-w-lg centered container
- Zustand stores: async actions, no auth dependency
- Primary color: violet-600
- Cards: rounded-2xl / rounded-3xl, shadow-sm, bg-white
- Haptic feedback on completions (navigator.vibrate)
- Toast notifications for user feedback
- BJJ theme: dynamic colors based on current belt level

# Brim Hub — Context Document

## What is this
App personal de bienestar para Mati Bodino. Tracking de hábitos, sistema de puntos gamificado con permitidos canjeables, niveles por cinturones BJJ, BJJ journal, y progreso visual. Mobile-first PWA, un solo usuario, sin auth.

## Stack
- **Framework:** Vite + React 19
- **Styling:** Tailwind CSS 4.2
- **State:** Zustand
- **Backend:** Supabase (Postgres + RLS abierta)
- **PWA:** vite-plugin-pwa
- **Deploy:** Vercel (brim-hub.vercel.app)
- **Routing:** react-router-dom

## Architecture

```
PWA (Vite + React + Tailwind)
├── /           → Dashboard (score, créditos, streak, nivel, macros, hábitos)
├── /habits     → Habit trackers + BJJ form + food log
├── /permitidos → Points balance + redeem catalog + history
├── /progress   → Heatmap + weight trend + BJJ journal
└── /profile    → Level, weight input, targets
        │
        ▼
   Supabase (birpqzahbtfbxxtaqeth)
   ├── habit_logs    (daily habits + BJJ metadata JSONB)
   ├── food_logs     (manual food entries)
   ├── weight_logs   (weekly weigh-ins)
   ├── points_log    (earned points per habit)
   ├── redeems       (permitido redemptions)
   ├── streaks       (cached, not yet used)
   ├── user_profile  (targets, not yet used)
   ├── chat_messages (reserved for v2)
   └── gym_routines  (reserved for v2)
```

## Key Patterns

### No Auth
Single user app. No login. User ID hardcoded as `MATI_ID` in `src/lib/constants.js`.
All RLS policies are `USING (true)` — open access.

### Constants-driven
All targets, habits, points economy, levels, and permitidos catalog defined in `src/lib/constants.js`. Both pages and stores import from there — single source of truth.

### Points Economy
- Each habit completion awards points (water 5, steps 10, bjj 20, gym 15)
- Perfect day (all 4 habits): x2 bonus
- 7+ day streak: x1.5 multiplier
- Points accumulate → determine level (Cinturón Blanco → Negro)
- Points can be redeemed for "permitidos" (treats)
- Balance = totalPoints - spentPoints

### Levels
| Level | Min Points | Badge |
|-------|-----------|-------|
| Cinturón Blanco | 0 | 🤍 |
| Cinturón Azul | 500 | 💙 |
| Cinturón Violeta | 1500 | 💜 |
| Cinturón Marrón | 3500 | 🤎 |
| Cinturón Negro | 7000 | 🖤 |

### BJJ Tracking
When user marks BJJ as done, a mini-form opens:
- Type: Gi / No-Gi
- Duration (minutes)
- Techniques worked
- Notes
Stored as `metadata` JSONB column in `habit_logs`.

### Food Logging (v1 — manual)
Simple form: meal type, description, estimated kcal, protein.
Stored in `food_logs` with `confirmed: true`.
No Claude/AI parsing in v1.

## File Structure

```
src/
├── App.jsx                    # Router with 5 routes, no auth gate
├── main.jsx                   # React entry point
├── index.css                  # Tailwind imports
├── components/
│   └── BottomNav.jsx          # 5-tab nav (Hoy, Hábitos, Permitidos, Progreso, Perfil)
├── pages/
│   ├── Dashboard.jsx          # Score + créditos + streak cards, level bar, macros, habits
│   ├── Habits.jsx             # HabitTracker components + BJJForm + FoodForm
│   ├── Permitidos.jsx         # Balance card, catalog grid, redeem history
│   ├── Progress.jsx           # 28-day heatmap, weight trend, BJJ journal
│   ├── Profile.jsx            # Level badge, weight input, targets display
│   └── Login.jsx              # UNUSED — kept but not mounted
├── stores/
│   ├── habitStore.js          # fetchToday, upsertHabit (with metadata support)
│   ├── foodStore.js           # fetchToday, addLog, confirmLog, getTodayMacros
│   ├── pointsStore.js         # fetchAll, awardPoints, checkPerfectDay, redeem, calcStreak, getLevel
│   └── authStore.js           # UNUSED — kept but not imported
└── lib/
    ├── constants.js           # MATI_ID, TARGETS, HABITS, POINTS, LEVELS, DEFAULT_PERMITIDOS, getLevel()
    └── supabase.js            # Supabase client (reads from VITE_SUPABASE_URL/KEY env vars)
```

## DB Schema

```sql
habit_logs     (id, user_id, date, habit_type, value, target, metadata JSONB, created_at)
               UNIQUE(user_id, date, habit_type)
food_logs      (id, user_id, logged_at, meal_type, description, calories, protein, carbs, fat, confirmed)
weight_logs    (id, user_id, date, weight, notes)  UNIQUE(user_id, date)
points_log     (id, user_id, date, source, points, created_at)
redeems        (id, user_id, item, emoji, cost, redeemed_at)
streaks        (id, user_id, habit_type, current_streak, best_streak, last_completed)
user_profile   (id, display_name, daily_calorie_target, daily_protein_target, ...)
chat_messages  (id, user_id, role, content, metadata JSONB)
gym_routines   (id, user_id, name, focus, exercises JSONB, duration_min)
```

## Supabase Config
- **Project:** birpqzahbtfbxxtaqeth.supabase.co
- **RLS:** All tables open (`USING (true)`)
- **Auth:** Email provider enabled but not used in app

## Pending (Steps 6-10)
- **Ciclos personales:** 4-week cycles with targets, weekly KPI traffic lights, flag on completion
- **PRs de gym:** personal records per exercise with progression history
- **Check-in semanal:** Sunday form (weight + reflection)
- **Compartir progreso:** screenshot to PNG for WhatsApp
- **Targets editables:** Profile page with editable daily/weekly targets
- **Permitidos custom:** user-defined treat catalog

## Dev Commands
```bash
npm run dev     # Vite dev server (port 5173)
npm run build   # Production build
npm run preview # Preview production build
```

## Conventions
- Spanish for user-facing text, English for code/comments
- No auth — MATI_ID hardcoded everywhere
- All Supabase queries use anon key (RLS open)
- Timezone: Argentina UTC-3 for date filtering
- Mobile-first: max-w-lg centered container
- Zustand stores: async actions, no auth dependency

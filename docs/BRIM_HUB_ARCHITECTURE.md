# BRIM HUB — Arquitectura Técnica & Plan de Build v2

## 0. INFO
- **Fecha:** 1 de abril de 2026
- **Autor:** Mati Bodino
- **Status:** v1 live, v2 en planificación
- **Companion:** PRD (BRIM_HUB_PRD.md)

---

## 1. VISIÓN TÉCNICA

Brim Hub es una PWA personal de wellness con 3 capas de inteligencia que escalan progresivamente:

1. **DATA LAYER** (v1 — DONE): Tracking manual de hábitos, comida, peso, gym, BJJ
2. **AI LAYER** (v2 — NEXT): Claude parsea comida, coach contextual, weekly digest automático
3. **AUTOMATION LAYER** (v3 — FUTURE): Apple Health sync, push notifications, gym routines AI

**En una oración:** Brim Hub pasa de "app donde Mati registra cosas" a "sistema que entiende a Mati y lo ayuda activamente."

---

## 2. STACK ACTUAL (v1)

| Layer | Technology | Por Qué |
|-------|-----------|---------|
| **Frontend** | Vite 8 + React 19 | Rápido, SPA, no SSR needed |
| **Styling** | Tailwind CSS 4.2 | Mobile-first, utility classes |
| **State** | Zustand 5 | Minimal, async stores, no boilerplate |
| **Backend** | Supabase (PostgreSQL) | Auth, DB, Storage, RLS, Edge Functions |
| **PWA** | vite-plugin-pwa | Service worker, installable, offline shell |
| **Deploy** | Vercel | Auto-deploy on push, free tier |
| **Routing** | react-router-dom 7 | 6 routes, client-side SPA |
| **Screenshot** | html2canvas | Share progress as PNG |

### Stack v2 (Additions)

| Layer | Technology | Por Qué |
|-------|-----------|---------|
| **AI** | Anthropic Claude API (claude-sonnet-4-5) | Food parsing, coach chat, weekly digest |
| **AI SDK** | @anthropic-ai/sdk | Direct API, no framework overhead |
| **Edge Functions** | Supabase Edge Functions (Deno) | Serverless AI calls, no CORS, secrets safe |
| **Push** | Web Push API + service worker | Notifications sin app store |

---

## 3. ARQUITECTURA DE DATOS

### 3.1 Schema Actual (v1 — 10 tablas)

```sql
-- CORE: User
user_profile (
  id UUID PK REFERENCES auth.users(id),
  display_name TEXT DEFAULT 'Mati',
  daily_calorie_target INT DEFAULT 2100,
  daily_protein_target INT DEFAULT 150,
  daily_carbs_target INT DEFAULT 210,
  daily_fat_target INT DEFAULT 70,
  daily_water_target NUMERIC(3,1) DEFAULT 2.5,
  daily_steps_target INT DEFAULT 10000,
  weekly_bjj_target INT DEFAULT 2,
  weekly_gym_target INT DEFAULT 2,
  target_weight NUMERIC(5,1),
  created_at, updated_at
)

-- CORE: Daily Habits
habit_logs (
  id UUID PK,
  user_id UUID,
  date DATE NOT NULL,
  habit_type TEXT CHECK ('water','steps','bjj','gym'),
  value NUMERIC(10,1),
  target NUMERIC(10,1),
  completion_type TEXT,  -- 'full', 'partial', 'skip'
  metadata JSONB,        -- BJJ: {tipo, duracion, tecnicas, notas}
  created_at,
  UNIQUE(user_id, date, habit_type)
)

-- CORE: Food
food_logs (
  id UUID PK,
  user_id UUID,
  logged_at TIMESTAMPTZ,
  meal_type TEXT CHECK ('desayuno','almuerzo','merienda','cena','snack'),
  description TEXT,
  calories INT,
  protein NUMERIC(5,1),
  carbs NUMERIC(5,1),
  fat NUMERIC(5,1),
  confirmed BOOLEAN,
  created_at
)

-- CORE: Weight
weight_logs (
  id UUID PK,
  user_id UUID,
  date DATE NOT NULL,
  weight NUMERIC(5,1),
  notes TEXT,           -- check-in reflection
  created_at,
  UNIQUE(user_id, date)
)

-- GAMIFICATION: Points
points_log (
  id UUID PK,
  user_id UUID,
  date DATE,
  source TEXT,          -- 'water','steps','bjj','gym','perfect_day','perfect_week'
  points INT,
  created_at
)

-- GAMIFICATION: Redeems
redeems (
  id UUID PK,
  user_id UUID,
  item TEXT,
  emoji TEXT,
  cost INT,
  redeemed_at TIMESTAMPTZ
)

-- TRACKING: Streaks (cached)
streaks (
  id UUID PK,
  user_id UUID,
  habit_type TEXT,
  current_streak INT,
  best_streak INT,
  last_completed DATE,
  updated_at,
  UNIQUE(user_id, habit_type)
)

-- TRACKING: Energy
daily_logs (
  id UUID PK,
  user_id UUID,
  date DATE,
  energy_level INT,     -- 1-5
  created_at,
  UNIQUE(user_id, date)
)

-- TRACKING: Gym PRs
gym_prs (
  id UUID PK,
  user_id UUID,
  exercise TEXT,
  weight NUMERIC(6,2),
  reps INT,
  notes TEXT,
  date DATE,
  created_at
)

-- GOALS: Cycles
cycles (
  id UUID PK,
  user_id UUID,
  name TEXT,
  started_at DATE,
  ends_at DATE,          -- started_at + 28 days
  status TEXT,           -- 'active','completed','abandoned'
  reflection TEXT,
  created_at
)

cycle_targets (
  id UUID PK,
  cycle_id UUID,
  habit_type TEXT,
  weekly_target INT,
  created_at
)

-- RESERVED (v2)
chat_messages (
  id UUID PK,
  user_id UUID,
  role TEXT CHECK ('user','assistant'),
  content TEXT,
  metadata JSONB,
  created_at
)

gym_routines (
  id UUID PK,
  user_id UUID,
  name TEXT,
  focus TEXT,
  exercises JSONB,
  duration_min INT,
  generated_at
)
```

### 3.2 Schema Nuevo (v2 — Additions)

```sql
-- AI: Food parsing log (para mejorar estimaciones)
CREATE TABLE ai_food_estimates (
  id UUID PK DEFAULT gen_random_uuid(),
  user_id UUID,
  food_log_id UUID REFERENCES food_logs(id),
  raw_input TEXT,          -- "comí 2 empanadas de carne"
  ai_estimate JSONB,       -- {calories: 520, protein: 28, carbs: 40, fat: 24}
  user_confirmed BOOLEAN,  -- ¿aceptó el estimado?
  user_override JSONB,     -- si editó, qué puso
  model TEXT,              -- 'claude-sonnet-4-5'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI: Chat context (para coach)
-- Usa chat_messages existente + metadata JSONB para contexto

-- AI: Weekly digest
CREATE TABLE weekly_digests (
  id UUID PK DEFAULT gen_random_uuid(),
  user_id UUID,
  week_start DATE,
  week_end DATE,
  digest_content TEXT,     -- Markdown generado por AI
  habits_summary JSONB,    -- {water: {done: 5, target: 7}, ...}
  insights JSONB,          -- ["Mejor semana de BJJ", "Bajaste 0.5kg"]
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- ENGAGEMENT: Micro-journal
CREATE TABLE journal_entries (
  id UUID PK DEFAULT gen_random_uuid(),
  user_id UUID,
  date DATE,
  content TEXT,            -- 1-2 líneas del día
  mood INT,                -- 1-5 (optional)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ANALYTICS: Events (para medir engagement)
CREATE TABLE app_events (
  id UUID PK DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT,         -- 'app_open','habit_completed','food_logged','chat_sent',...
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. ARCHITECTURE: AI LAYER (v2)

### 4.1 AI Food Parsing

**Flow:**
```
User types: "Almorcé milanesas con ensalada y arroz"
        ↓
Frontend → POST /api/parse-food
        ↓
Supabase Edge Function:
  1. System prompt: "Sos un nutricionista. Estimá macros para comida argentina..."
  2. Claude response: {meal_type, description, calories, protein, carbs, fat, confidence}
  3. Return to frontend
        ↓
Frontend shows estimate with edit option
        ↓
User confirms/edits → save to food_logs + ai_food_estimates
```

**System Prompt (parse-food):**
```
Sos un nutricionista especializado en comida argentina y latina.
El usuario te dice qué comió en lenguaje natural.
Estimá los macronutrientes de la forma más precisa posible.

Reglas:
- Porciones argentinas (un plato de milanesas = ~300g de carne)
- Si hay ambigüedad, asumí porción estándar de adulto
- Devolvé SOLO JSON, sin explicación
- Incluí un campo "confidence" (low/medium/high)

Output format:
{
  "meal_type": "almuerzo",
  "description": "Milanesas con ensalada y arroz",
  "calories": 750,
  "protein": 45,
  "carbs": 60,
  "fat": 32,
  "confidence": "medium",
  "breakdown": "Milanesas ~450kcal, arroz ~200kcal, ensalada ~100kcal"
}
```

### 4.2 AI Coach Chat

**Flow:**
```
User asks: "¿Cómo vengo esta semana?"
        ↓
Frontend → POST /api/chat
        ↓
Supabase Edge Function:
  1. Fetch context:
     - Last 7 days habit_logs
     - Last 7 days food_logs (daily macro totals)
     - Current streak
     - Current cycle + targets
     - Last weight_logs (2 entries)
     - Last 5 chat_messages (history)
  2. Build system prompt with context
  3. Claude generates response
  4. Save to chat_messages
  5. Stream response to frontend
        ↓
Frontend renders streamed response
```

**System Prompt (coach):**
```
Sos Brim, el coach personal de bienestar de Mati.

Personalidad:
- Directo, no condescendiente
- Celebrás wins reales (no inventados)
- Señalás problemas sin drama
- Usás humor argentino cuando viene al caso
- Nunca decís "¡Excelente trabajo!" genérico

Tenés acceso a estos datos de la semana:
{context_json}

Reglas:
- Respondé basándote SOLO en los datos que tenés
- Si no hay data, decilo: "No tenés comidas loggeadas hoy"
- Usá números específicos: "Llevás 1.5L de agua, te faltan 1L"
- Sugerí acciones concretas: "Tomate 500ml antes de las 3pm"
- No des consejos médicos
- Respuestas cortas (3-5 oraciones máximo)
```

**Context Assembly (lo que el coach sabe):**
```javascript
async function buildCoachContext(userId) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = // 7 days ago

  const [habits, food, weight, streak, cycle, targets] = await Promise.all([
    supabase.from('habit_logs').select('*').eq('user_id', userId).gte('date', weekAgo),
    supabase.from('food_logs').select('*').eq('user_id', userId).gte('logged_at', weekAgo),
    supabase.from('weight_logs').select('*').eq('user_id', userId).order('date', {ascending: false}).limit(5),
    // streak from pointsStore logic
    supabase.from('cycles').select('*, cycle_targets(*)').eq('user_id', userId).eq('status', 'active').single(),
    supabase.from('user_profile').select('*').eq('id', userId).single(),
  ])

  return {
    today,
    habits_this_week: habits.data,
    food_today: food.data?.filter(f => f.logged_at.startsWith(today)),
    food_this_week_summary: summarizeFoodByDay(food.data),
    weight_trend: weight.data,
    current_streak: calculateStreak(habits.data),
    active_cycle: cycle.data,
    targets: targets.data,
  }
}
```

### 4.3 Weekly AI Digest

**Trigger:** Domingo a las 20:00 (pg_cron) o al abrir la app el lunes.

**Flow:**
```
Cron/App Open → Edge Function: generate-weekly-digest
  1. Fetch last 7 days: habits, food, weight, energy, cycle progress
  2. Calculate KPIs: completion %, streak, macros avg, weight delta
  3. Claude generates narrative digest
  4. Save to weekly_digests
  5. Show on Dashboard (lunes AM)
```

**Output format:**
```markdown
## Semana del 24 al 30 de marzo

**Score: 78%** — 5 de 7 días activos.

**Wins:**
- BJJ 2 de 2 sesiones ✅ (Gi el martes, No-Gi el jueves)
- Streak de 12 días 🔥
- Bajaste 0.3kg (83.2 → 82.9)

**A mejorar:**
- Solo loggeaste 8 comidas en la semana (target: 21)
- Agua: promedio 1.8L/día (target: 2.5L)

**Recomendación para esta semana:**
Enfocate en loggear al menos almuerzo y cena todos los días.
Ponete una alarma a las 10am para el primer vaso de agua.
```

---

## 5. FRONTEND ARCHITECTURE (v2 Updates)

### 5.1 Estructura de Archivos (v2)

```
src/
├── App.jsx                     # Router (6 rutas + chat)
├── main.jsx
├── index.css
├── components/
│   ├── BottomNav.jsx           # 5 tabs
│   ├── ShareButton.jsx
│   ├── ShareCard.jsx
│   ├── chat/
│   │   ├── ChatBubble.jsx      # NEW: Message bubble (user/assistant)
│   │   ├── ChatInput.jsx       # NEW: Text input + send
│   │   └── FoodEstimateCard.jsx # NEW: Shows AI food estimate + confirm/edit
│   ├── digest/
│   │   └── WeeklyDigest.jsx    # NEW: Renders weekly AI summary
│   └── journal/
│       └── MicroJournal.jsx    # NEW: 1-line daily input
├── pages/
│   ├── Dashboard.jsx           # + weekly digest card + micro-journal
│   ├── Habits.jsx              # + food AI input mode
│   ├── Permitidos.jsx
│   ├── Progress.jsx            # + trends charts
│   ├── Profile.jsx
│   ├── Checkin.jsx
│   └── Chat.jsx                # REWRITE: Full AI coach chat
├── stores/
│   ├── habitStore.js
│   ├── pointsStore.js
│   ├── foodStore.js            # + AI parsing integration
│   ├── energyStore.js
│   ├── cycleStore.js
│   ├── gymPrStore.js
│   ├── targetsStore.js
│   ├── chatStore.js            # NEW: Chat messages + streaming
│   ├── digestStore.js          # NEW: Weekly digest fetch/display
│   └── journalStore.js         # NEW: Micro-journal CRUD
└── lib/
    ├── constants.js
    ├── supabase.js
    └── ai.js                   # NEW: AI API helpers (parseFood, chat, digest)
```

### 5.2 API Routes (Supabase Edge Functions)

```
supabase/functions/
├── parse-food/index.ts         # POST: text → {macros}
├── chat/index.ts               # POST: message + context → streamed response
├── weekly-digest/index.ts      # POST: generate digest for week
└── _shared/
    ├── context.ts              # Shared context assembly logic
    └── anthropic.ts            # Claude client setup
```

---

## 6. DATA FLOW DIAGRAMS

### 6.1 Food Logging (v2)

```
┌──────────────────────────────────────────────┐
│  User: "Almorcé milanesas con ensalada"       │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│  Frontend: POST /functions/v1/parse-food      │
│  Body: { text: "...", meal_type: "almuerzo" } │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│  Edge Function:                               │
│  1. Build prompt with Argentine food context  │
│  2. Call Claude (claude-sonnet-4-5)           │
│  3. Parse JSON response                       │
│  4. Return estimate                           │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│  Frontend: Show FoodEstimateCard              │
│  "~750 kcal | 45g prot | 60g carbs | 32g fat"│
│  [✅ Confirmar]  [✏️ Editar]                  │
└──────────────┬───────────────────────────────┘
               ↓ (on confirm)
┌──────────────────────────────────────────────┐
│  Save to: food_logs + ai_food_estimates       │
│  Update: Dashboard macros                     │
│  Award: Points if macros in range (v2.1)      │
└──────────────────────────────────────────────┘
```

### 6.2 Coach Chat

```
┌──────────────────────────────────────────────┐
│  User: "¿Cómo vengo esta semana?"             │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│  chatStore.sendMessage(text)                  │
│  1. Save user message to chat_messages        │
│  2. POST /functions/v1/chat                   │
│     Body: { message, history (last 10) }      │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│  Edge Function:                               │
│  1. buildCoachContext(userId)                  │
│     → habits, food, weight, streak, cycle     │
│  2. System prompt + context + history         │
│  3. Stream response from Claude               │
│  4. Save assistant message to chat_messages   │
└──────────────┬───────────────────────────────┘
               ↓ (streamed)
┌──────────────────────────────────────────────┐
│  Frontend: ChatBubble renders incrementally   │
│  "Vas bien esta semana: 4/7 días activos,     │
│   streak de 12 🔥. Pero te faltan 2 BJJs..."  │
└──────────────────────────────────────────────┘
```

---

## 7. IMPLEMENTACIÓN: TASK BREAKDOWN

### Fase 2A: AI Layer (2 semanas de dev)

#### Task 1: Edge Function setup (1 día)
- [ ] Crear proyecto Supabase Edge Functions
- [ ] Configurar ANTHROPIC_API_KEY como secret
- [ ] Crear _shared/anthropic.ts (Claude client)
- [ ] Crear _shared/context.ts (context assembly)
- [ ] Deploy test function

#### Task 2: AI Food Parsing (3 días)
- [ ] Edge Function: parse-food/index.ts
- [ ] System prompt para comida argentina
- [ ] Frontend: FoodEstimateCard component
- [ ] Frontend: Modo AI en Habits.jsx (text input → estimate → confirm)
- [ ] foodStore: addFromAI(estimate) method
- [ ] Tabla: ai_food_estimates
- [ ] Testing con 20 comidas comunes

#### Task 3: AI Coach Chat (3 días)
- [ ] Edge Function: chat/index.ts (con streaming)
- [ ] Context assembly: buildCoachContext()
- [ ] System prompt para coach personalidad
- [ ] chatStore: sendMessage, fetchHistory, streaming state
- [ ] Chat.jsx: Full rewrite (bubbles, input, scroll, loading)
- [ ] Tabla: chat_messages (ya existe, agregar metadata)
- [ ] Testing conversacional

#### Task 4: Weekly AI Digest (2 días)
- [ ] Edge Function: weekly-digest/index.ts
- [ ] KPI calculation logic (completion %, streak, weight delta)
- [ ] System prompt para digest narrativo
- [ ] digestStore: fetchCurrentWeek, fetchPast
- [ ] WeeklyDigest.jsx component
- [ ] Dashboard.jsx: mostrar digest del lunes
- [ ] Tabla: weekly_digests

### Fase 2B: Engagement (2 semanas)

#### Task 5: Push Notifications (3 días)
- [ ] Service worker update para push
- [ ] Web Push API registration
- [ ] Edge Function: send-notification (cron trigger)
- [ ] Notification schedule: 9am agua, 8pm check-in, lunes digest
- [ ] Profile.jsx: toggle notifications on/off

#### Task 6: Micro-Journal (2 días)
- [ ] journal_entries table
- [ ] journalStore: save, fetch, fetchMonth
- [ ] MicroJournal.jsx: inline input en Dashboard
- [ ] Progress.jsx: calendar view de journal entries

#### Task 7: Post-Cycle AI Suggestions (2 días)
- [ ] Edge Function: cycle-reflection/index.ts
- [ ] Análisis de ciclo completo → sugerencia para próximo
- [ ] UI: modal al cerrar ciclo con sugerencia AI

#### Task 8: Trends Charts (3 días)
- [ ] Weight line chart (últimos 30 días)
- [ ] Macros daily avg line chart
- [ ] Habit completion % by week bar chart
- [ ] Library: Chart.js o Recharts (lightweight)

#### Task 9: UX Polish (2 días)
- [ ] Haptic feedback (navigator.vibrate)
- [ ] Skeleton loaders
- [ ] Transition animations entre páginas
- [ ] Pull-to-refresh pattern

---

## 8. COST MODEL (v2)

```
SERVICIO          COSTO/MES     NOTAS
Supabase          $0            Free tier (suficiente para 1 user)
Vercel            $0            Free tier
Claude API        ~$15-30       Estimado:
                                - Food parsing: ~10 calls/day × 30 = 300 calls
                                  × ~$0.01/call = $3/month
                                - Coach chat: ~5 calls/day × 30 = 150 calls
                                  × ~$0.03/call = $4.50/month
                                - Weekly digest: 4/month × $0.05 = $0.20
                                - Buffer for longer conversations: ~$10
Web Push          $0            Free (self-hosted via service worker)
Domain (optional) $12/year      brimhub.app or similar
─────────────────────────────────
TOTAL             ~$15-30/month
```

---

## 9. DECISIONES PENDIENTES (v2)

| # | Decisión | Opciones | Cuándo Decidir |
|---|----------|----------|----------------|
| 1 | ¿Claude como Edge Function o API route en Vercel? | Supabase EF (secrets safe, mismo backend) vs Vercel serverless (same deploy) | Antes de Task 1 |
| 2 | ¿Streaming chat o response completa? | Streaming (mejor UX) vs complete (más simple) | Task 3 |
| 3 | ¿Library de charts? | Recharts (React-native) vs Chart.js (más liviano) vs CSS-only | Task 8 |
| 4 | ¿Dominio custom? | brimhub.app ($12/yr) vs brim-hub.vercel.app (free) | Post v2 launch |
| 5 | ¿Multi-user en v3? | Add auth + RLS real vs mantener single-user | Mes 4+ |

---

*Documento técnico: Brim Hub v2*
*Abril 2026*

# Brim Hub v2 — Cursor Prompts (en orden de ejecución)

Pegar estos prompts en Cursor uno por uno, en orden. Cada prompt asume que el anterior ya fue implementado.

---

## PROMPT 1: Setup Edge Functions + Claude Client

```
Necesito configurar Supabase Edge Functions para Brim Hub con el Anthropic SDK.

Contexto:
- App en /Users/matiasbodino/Rufus Net/brim-hub/
- Supabase project: birpqzahbtfbxxtaqeth
- Ya tengo las tablas core (habit_logs, food_logs, weight_logs, points_log, etc.)
- Necesito Edge Functions para llamadas a Claude API

Lo que necesito:

1. Crear la estructura de Edge Functions:
   supabase/functions/_shared/anthropic.ts → Cliente Anthropic reutilizable
   supabase/functions/_shared/context.ts → Helper para ensamblar contexto del usuario

2. En anthropic.ts:
   - Importar Anthropic SDK
   - Crear cliente con env var ANTHROPIC_API_KEY
   - Export helper `callClaude(systemPrompt, userMessage, options?)` que devuelve texto
   - Export helper `streamClaude(systemPrompt, userMessage, options?)` que devuelve ReadableStream

3. En context.ts:
   - Import Supabase client
   - Export `buildUserContext(userId)` que hace queries paralelas a:
     - habit_logs (últimos 7 días)
     - food_logs (últimos 7 días, agrupados por día con totales de macros)
     - weight_logs (últimos 5 registros)
     - points_log (calcular streak actual)
     - cycles (ciclo activo + targets)
     - user_profile (targets)
     - daily_logs (energy últimos 7 días)
   - Devuelve un objeto JSON limpio con toda la data formateada
   - Incluir cálculos: completion % por hábito, streak, weight delta, macro averages

4. Crear un Edge Function de test: supabase/functions/health/index.ts
   - Que llame a Claude con "Decime hola" y devuelva la respuesta
   - Para verificar que funciona el setup

User ID hardcodeado: c17e4105-4861-43c8-bf13-0d32f7818418

NO crear auth. NO tocar el frontend todavía. Solo el backend de Edge Functions.
```

---

## PROMPT 2: AI Food Parsing

```
Necesito implementar AI food parsing para Brim Hub. El usuario escribe qué comió en lenguaje natural y Claude estima los macros.

Contexto:
- Ya tengo Edge Functions setup con cliente Anthropic en supabase/functions/_shared/
- Tabla food_logs ya existe
- App es para usuario argentino (porciones y comidas argentinas)

Lo que necesito:

### Backend (Edge Function):

1. Crear supabase/functions/parse-food/index.ts:
   - Recibe POST con: { text: "almorcé milanesas con ensalada", meal_type?: "almuerzo" }
   - System prompt especializado en comida argentina/latina:
     * Estima porciones estándar de adulto argentino
     * Conoce platos típicos (milanesas, empanadas, asado, pastas, guiso, etc.)
     * Devuelve JSON con: meal_type, description, calories, protein, carbs, fat, confidence (low/medium/high), breakdown
   - Valida que el JSON sea parseable
   - Devuelve el estimado

2. Crear nueva tabla ai_food_estimates:
   - id, user_id, food_log_id (FK), raw_input, ai_estimate (JSONB), user_confirmed (BOOL), user_override (JSONB), model, created_at

### Frontend:

3. En src/pages/Habits.jsx, agregar modo AI al food logging:
   - Nuevo estado: "manual" vs "ai" (toggle o tabs)
   - En modo AI: text input simple (placeholder: "¿Qué comiste?")
   - Al enviar: loading state → mostrar FoodEstimateCard
   - FoodEstimateCard muestra: estimación de macros + breakdown + confidence
   - Botones: [✅ Confirmar] [✏️ Editar] [🔄 Reintentar]
   - Confirmar → save a food_logs + ai_food_estimates
   - Editar → abre form manual pre-rellenado con los valores del AI

4. Crear src/components/chat/FoodEstimateCard.jsx:
   - Card con los macros estimados, visualmente claro
   - Indicador de confidence (🟢 high, 🟡 medium, 🔴 low)
   - Breakdown expandible ("Milanesas ~450kcal, ensalada ~100kcal, arroz ~200kcal")

5. En src/stores/foodStore.js:
   - Agregar método: parseWithAI(text, mealType?) → llama a Edge Function
   - Agregar método: confirmAIEstimate(estimate, foodLogId) → save ambas tablas

Mantener el form manual como fallback. El AI mode debería ser el default.
El Supabase URL base para Edge Functions es: https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1/
```

---

## PROMPT 3: AI Coach Chat

```
Necesito implementar el chat con AI coach para Brim Hub. Es un chat conversacional donde el usuario puede preguntar sobre su progreso, pedir consejos, etc. Claude tiene acceso a toda la data del usuario.

Contexto:
- Edge Functions ya configuradas con Anthropic SDK
- Context builder ya existe en _shared/context.ts
- Tabla chat_messages ya existe (id, user_id, role, content, metadata, created_at)
- User ID: c17e4105-4861-43c8-bf13-0d32f7818418

Lo que necesito:

### Backend:

1. Crear supabase/functions/chat/index.ts:
   - Recibe POST: { message: "¿Cómo vengo esta semana?", history: [...last 10 messages] }
   - Ensambla contexto completo del usuario usando buildUserContext()
   - System prompt del coach "Brim":
     * Personalidad: directo, no condescendiente, celebra wins reales, señala problemas sin drama, humor argentino
     * Responde SOLO basado en datos reales del usuario
     * Si no hay data, lo dice: "No tenés comidas loggeadas hoy"
     * Usa números específicos: "Llevás 1.5L de agua, te faltan 1L"
     * Sugiere acciones concretas
     * Respuestas cortas (3-5 oraciones máximo)
     * No da consejos médicos
   - Streaming response (SSE)
   - Guarda assistant message en chat_messages

### Frontend:

2. Rewrite completo de src/pages/Chat.jsx:
   - Chat UI completo: lista de mensajes (burbujas user/assistant), input, scroll to bottom
   - Streaming: mostrar respuesta token por token
   - Historia: cargar últimas 20 conversaciones al abrir
   - Empty state: "Preguntame sobre tu progreso, comida, o lo que necesites 💪"
   - Quick actions (chips): "¿Cómo vengo hoy?", "¿Qué debería comer?", "Mi semana"

3. Crear src/stores/chatStore.js (Zustand):
   - State: messages[], isStreaming, error
   - Methods: fetchHistory(), sendMessage(text), clearHistory()
   - Streaming: append tokens a último message en real-time

4. Crear src/components/chat/ChatBubble.jsx:
   - User bubble: derecha, violeta
   - Assistant bubble: izquierda, gris claro
   - Markdown rendering (bold, listas, emojis)
   - Timestamp sutil

5. Crear src/components/chat/ChatInput.jsx:
   - Input con botón send
   - Disabled while streaming
   - Enter para enviar, Shift+Enter para nueva línea

Estilo visual consistente con el resto de la app (Tailwind, violeta, mobile-first, max-w-lg).
```

---

## PROMPT 4: Weekly AI Digest

```
Necesito implementar el weekly digest automático para Brim Hub. Cada lunes, el usuario ve un resumen AI de su semana anterior en el Dashboard.

Contexto:
- Edge Functions configuradas con Anthropic
- Context builder disponible
- Dashboard.jsx ya existe

Lo que necesito:

### Backend:

1. Crear supabase/functions/weekly-digest/index.ts:
   - Recibe POST: { week_start: "2026-03-24" } (o calcula automáticamente la semana anterior)
   - Queries:
     * habit_logs de la semana (por día y por tipo)
     * food_logs de la semana (macros promedio por día)
     * weight_logs de la semana (delta)
     * points_log (puntos ganados en la semana)
     * energy (daily_logs promedio)
     * cycle activo (progreso semanal)
   - Calcula KPIs:
     * Días activos (de 7)
     * Completion % por hábito
     * Streak actual
     * Peso delta
     * Macro promedio vs target
     * Puntos ganados
   - Claude genera digest narrativo en markdown (max 200 palabras):
     * Score general
     * Top 2-3 wins
     * Top 1-2 áreas a mejorar
     * 1 recomendación accionable para esta semana
   - Guarda en weekly_digests table

2. Crear tabla weekly_digests:
   - id, user_id, week_start (DATE), week_end (DATE), digest_content (TEXT), habits_summary (JSONB), insights (JSONB), created_at
   - UNIQUE(user_id, week_start)

### Frontend:

3. Crear src/stores/digestStore.js:
   - State: currentDigest, loading
   - Methods: fetchCurrentWeek(), generateDigest()

4. Crear src/components/digest/WeeklyDigest.jsx:
   - Card colapsable en Dashboard
   - Muestra digest en markdown renderizado
   - Si no existe para esta semana: botón "Generar resumen" (llama a Edge Function)
   - Mostrar solo de lunes a miércoles (después ya no es relevante)

5. En Dashboard.jsx:
   - Agregar WeeklyDigest card entre el score/streak section y los macros
   - Solo visible si es lunes/martes/miércoles
   - Collapsed by default, expandible

Mantener el estilo visual de la app. Cards blancas con sombra sutil.
```

---

## PROMPT 5: Micro-Journal + Analytics Events

```
Necesito agregar dos features a Brim Hub: micro-journal diario y tracking de analytics events.

### Micro-Journal:

1. Crear tabla journal_entries:
   - id, user_id, date (UNIQUE con user_id), content (TEXT), mood (INT 1-5 optional), created_at

2. Crear src/stores/journalStore.js:
   - State: todayEntry, loading
   - Methods: fetchToday(), save(content, mood?), fetchMonth(yearMonth)

3. Crear src/components/journal/MicroJournal.jsx:
   - Input inline en Dashboard (debajo de macros, arriba de hábitos)
   - Placeholder: "¿Cómo fue tu día en una línea?"
   - Si ya escribió hoy: muestra el texto (editable al tocar)
   - Mood picker opcional: 5 emojis (😫😕😐😊🔥)
   - Auto-save on blur

4. En Progress.jsx:
   - Agregar sección "Journal" con entradas del mes actual
   - Lista simple: fecha + contenido + mood emoji

### Analytics Events:

5. Crear tabla app_events:
   - id, user_id, event_type (TEXT), metadata (JSONB), created_at

6. Crear src/lib/analytics.js:
   - Export función track(eventType, metadata?)
   - Hace insert async a app_events (fire and forget, no blocking)
   - Eventos a trackear:
     * 'app_open' — al cargar Dashboard
     * 'habit_completed' — {habit_type, completion_type}
     * 'food_logged' — {method: 'manual'|'ai', meal_type}
     * 'chat_sent' — {message_length}
     * 'permitido_redeemed' — {item, cost}
     * 'share_exported' — {}
     * 'checkin_completed' — {}
     * 'cycle_created' — {name}
     * 'cycle_completed' — {name, duration_days}

7. Integrar track() calls en los stores y pages correspondientes.
   No cambiar la UX — solo agregar los calls de tracking silenciosamente.

User ID: c17e4105-4861-43c8-bf13-0d32f7818418
```

---

## PROMPT 6: UX Polish + Trends

```
Necesito mejorar la UX de Brim Hub y agregar charts de tendencias.

### UX Polish:

1. Skeleton loaders:
   - Dashboard: skeleton para score cards, macros, hábitos
   - Habits: skeleton para habit cards
   - Progress: skeleton para heatmap, charts
   - Usar Tailwind animate-pulse con bg-gray-200 rounded blocks

2. Transiciones entre páginas:
   - Fade-in suave al cambiar de tab (200ms opacity transition)
   - No usar framer-motion si no está ya — CSS transitions alcanza

3. Pull-to-refresh pattern:
   - En Dashboard: pull down → refetch all stores
   - Visual: spinner + "Actualizando..."

4. Haptic feedback:
   - navigator.vibrate(10) al completar hábito
   - navigator.vibrate([50, 30, 50]) al perfect day
   - navigator.vibrate(5) al canjear permitido
   - Wrap en try/catch (no todos los browsers lo soportan)

5. Toast notifications:
   - Al completar hábito: "💧 +5 pts"
   - Perfect day: "🎯 Perfect Day! x2 bonus"
   - Level up: "🎉 Cinturón Azul!"
   - Implementar toast simple (div absolute, auto-dismiss 2s)
   - No instalar librería — hacer componente propio

### Trends Charts:

6. Instalar recharts (lightweight, React-native):
   npm install recharts

7. En Progress.jsx, agregar sección "Tendencias":
   - Line chart: Peso últimos 30 días (con target line punteada)
   - Bar chart: Habit completion % por semana (últimas 8 semanas)
   - Line chart: Macros promedio diario últimos 14 días (calories line + protein line)
   - Cada chart en su propia card, collapsable
   - Colores: violeta para data, gris para target/reference

Mantener todo mobile-first, max-w-lg, cards blancas con rounded-xl shadow-sm.
```

---

## NOTAS PARA CURSOR

- **Supabase Edge Functions** se deployean con: `supabase functions deploy <nombre>`
- **ANTHROPIC_API_KEY** se setea como secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
- **Modelo recomendado:** `claude-sonnet-4-5` para food parsing y chat (bueno y barato)
- **Modelo para digest:** `claude-sonnet-4-5` (no necesita opus)
- **User ID hardcoded:** `c17e4105-4861-43c8-bf13-0d32f7818418`
- **Timezone:** Argentina UTC-3
- **No auth** — todo abierto, un solo usuario

---

*6 prompts = ~2-3 semanas de trabajo en Cursor*
*Ejecutar en orden. Cada prompt es independiente pero asume el anterior.*

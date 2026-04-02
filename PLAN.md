# Brim Hub — Implementation Plan

**Overall Progress:** `85%`

## TLDR
Personal health OS dark-mode con 6 pilares: Nutrición, Caminata, BJJ/Gym, Respiración, Hidratación y Progreso. AI coach "Brim" con voz argentina genera planes diarios adaptativos, sugiere comidas macro-perfect, detecta fatiga y ajusta targets en tiempo real. PWA mobile-first en Vercel + Supabase Edge Functions con Claude.

## Critical Decisions
- **Home = read-only.** Toda interacción vive en /habits (Diario). Home solo muestra estado.
- **Nutrition pesa 50% del Wellness Score.** Sin comida loggeada, score max ~20%.
- **"Never Miss Twice" streak.** 1 día sin actividad perdonado, 2+ rompen racha (salvo escudo).
- **Mate = 0.7x hidratación.** 1L mate = 700ml agua efectiva.
- **Per-meal calorie caps.** Desayuno 600, almuerzo 800, merienda 400, cena 700.
- **Dark mode #0a0a0a global.** Glassmorphism bg-white/5 border-white/10.
- **CSS animations, no Framer Motion.** Bundle liviano.
- **AI food parsing via Claude.** No base de datos de alimentos en v1.

## Tasks:

### Core Infrastructure
- [x] 🟩 **Supabase tables** — habit_logs, food_logs, weight_logs, points_log, daily_plans, user_insights, user_model, workout_logs, damage_control
- [x] 🟩 **Zustand stores** — 15 stores, 5 con persist middleware
- [x] 🟩 **Daily reset** — useDailyReset (midnight + visibility change)
- [x] 🟩 **Background sync** — useSync (rehydrate + pending queue)
- [x] 🟩 **Sync indicator** — "✓ Sincronizado" pill

### Edge Functions (10 deployed)
- [x] 🟩 **parse-food** — Porciones argentinas, aderezos ocultos, query_adjustment
- [x] 🟩 **parse-intent** — Spotlight NLP: HABIT/FOOD/REDEEM/MOOD/DAMAGE
- [x] 🟩 **chat** — Coach con user_model + insights en contexto
- [x] 🟩 **weekly-digest** — Resumen semanal + KPIs + tono Brim
- [x] 🟩 **daily-plan** — Targets adaptativos + meals + recovery + fatiga + damage
- [x] 🟩 **generate-insights** — 90 días: correlaciones energía/proteína, underreport detection
- [x] 🟩 **generate-routine** — Gym programming con PRs + deload + auto-regulación
- [x] 🟩 **chef-suggest** — Receta macro-perfect con ingredientes + caps por comida
- [x] 🟩 **monthly-email** — HTML email via Resend
- [x] 🟩 **health** — Test endpoint

### Pages (12 routes)
- [x] 🟩 **Onboarding** — Goal → Level → Weight target (3 pasos)
- [x] 🟩 **Dashboard** — Read-only: ring, macros, próximo paso, habits summary, food preview
- [x] 🟩 **Habits (Diario)** — Energía, peso, agua/mate, pasos, gym, bjj, food AI/manual, journal
- [x] 🟩 **Chat** — AI coach Brim + "Nuevo chat"
- [x] 🟩 **Permitidos** — Grid 2-col, golden balance, historial toggle
- [x] 🟩 **Progress** — Heatmap, bio-radar 6 pilares, trofeos, 1RM, balance radar, cycles, insights, reporte
- [x] 🟩 **Profile** — Level, peso, targets editables, weight goal
- [x] 🟩 **Checkin** — Check-in dominical
- [x] 🟩 **Workout** — Ejercicio por pantalla, timer circular, PR detection, RPE
- [x] 🟩 **Walk** — Misión calórica, stats live, respiración nasal
- [x] 🟩 **BJJ Session** — Strain score (emojis), recovery suggestion
- [x] 🟩 **Breathe** — Box/Coherente/4-7-8, 😊 animada, 1-20 min

### AI Systems
- [x] 🟩 **Insights Engine** — energyVsProtein, weightVsCalories, 90-day patterns
- [x] 🟩 **Adaptive Training** — Performance deltas → +5% o bajar RPE
- [x] 🟩 **Deload Detection** — Pesos bajando 2+ sesiones o energía ≤2
- [x] 🟩 **Recovery Engine** — Training load spike (dur × RPE) > 130% promedio
- [x] 🟩 **Fatigue Detection** — Energía ≤2 por 2+ días → recovery day
- [x] 🟩 **Damage Control** — "Me pasé" distribuido en 3-5 días
- [x] 🟩 **Alcohol Detection** — Cleanup day, agua +1L
- [x] 🟩 **Active Burn METs** — Steps + gym + BJJ → kcal estimadas
- [x] 🟩 **Regenerative Plan** — Brief + meals se regeneran con cada log
- [x] 🟩 **Streak Shields** — 100 pts, protege racha de 2+ días sin actividad

### UX/UI
- [x] 🟩 **Dark mode global** — #0a0a0a, glassmorphism
- [x] 🟩 **Haptic feedback** — light/medium/heavy/heartbeat
- [x] 🟩 **Animated counter** — useAnimatedValue hook
- [x] 🟩 **Confetti** — canvas-confetti en 100% vitality
- [x] 🟩 **Touch targets 44px** — Todos los botones
- [x] 🟩 **Portion selector** — Chico 0.7x / Normal / XL 1.3x
- [x] 🟩 **Empty states** — Frases de Brim argentinas
- [x] 🟩 **PWA** — Meta tags, icon BJJ belt, standalone
- [x] 🟩 **Quick Actions** — FAB + grid 3x3 blur
- [x] 🟩 **Spotlight** — NLP → parse-intent → execute
- [x] 🟩 **Timeline** — Done/Ahora/Pendiente con línea vertical
- [x] 🟩 **Wellness Ring** — conic-gradient con sub-scores
- [x] 🟩 **Monthly Report** — html2canvas → PNG → navigator.share

### Next Sprint (P1)
- [ ] 🟥 **Food database** — FatSecret/Nutritionix API para búsqueda + barcode
- [ ] 🟥 **Push notifications** — Service worker + reminders contextuales
- [ ] 🟥 **Wearable sync** — Apple HealthKit (Capacitor/native)
- [ ] 🟥 **Weekly Review card** — Lunes auto-generada "Tu semana" + predicción
- [ ] 🟥 **ShareFighterCard** — 9:16 Stories con score + stats
- [ ] 🟥 **Evolving cues** — Semana 1: "Tomá 1 vaso" → Semana 4: "Probá 3L"
- [ ] 🟥 **BJJ journal template** — Sparring/técnica, con quién, qué aprendiste
- [ ] 🟥 **Gym PR estimates** — "¿Cuánto sentadillás aprox?" en vez de "—"
- [ ] 🟥 **Points explainer** — Pantalla "Cómo ganar puntos"
- [ ] 🟥 **Radar benchmark** — "Forma ideal" overlay en bio-balance

# BRIM HUB — Product Requirements Document (PRD)

## 0. DOCUMENT INFO
- **Fecha:** 1 de abril de 2026
- **Owner:** Matías Bodino
- **Status:** v1 Live (50% features shipped), v2 en planificación
- **URL:** https://brim-hub.vercel.app
- **Documentos Acompañantes:** Arquitectura Técnica (BRIM_HUB_ARCHITECTURE.md)
- **Versión:** 2.0 (Post-launch, refleja realidad + roadmap)

---

## 1. PREREQUISITO: USER DELIGHT

### 1.1 El Problema

Mati quiere construir hábitos de salud sostenibles: hidratación, movimiento, BJJ, gym, alimentación. Las apps existentes (MyFitnessPal, Streaks, Strong, etc.) tienen 3 problemas:

1. **Fragmentación:** Agua en una app, gym en otra, BJJ en un cuaderno, comida en otra. No hay un sistema unificado que conecte todo.
2. **Genéricas:** No entienden el contexto personal (cinturones BJJ, permitidos como recompensa, ciclos de 4 semanas como sistema de metas).
3. **No son divertidas:** Tracking se siente como obligación. Sin gamificación personal que conecte con la motivación real (canjear pizza por puntos, subir de cinturón).

**Síntoma raíz:** No existe una app que combine habit tracking + gamificación personal + periodización por ciclos + journal de BJJ + tracking de gym + macros, todo en un solo lugar con el lenguaje y las reglas de Mati.

### 1.2 El Usuario (Persona Única)

**Mati Bodino — 30 años, CEO de agencia, BJJ white/blue belt**

- **Contexto:** Trabaja 10+ horas/día. Necesita un sistema que simplifique el tracking, no que lo complique.
- **Motivadores:** Progresar en BJJ, verse bien, tener energía, disfrutar la comida sin culpa.
- **Pain Points actuales:**
  - "Tomo agua pero no sé cuánta, entonces no registro"
  - "Fui al gym pero no tengo dónde anotar mis PRs"
  - "Quiero pizza pero me siento culpable → sistema de permitidos lo resuelve"
  - "Empiezo bien la semana y para el jueves ya no trackeo nada"
  - "No sé si estoy mejor o peor que hace un mes"

### 1.3 Qué es "Magic"

| Momento | Magic |
|---------|-------|
| Abrir la app a la mañana | Ver score de ayer, streak, nivel actual, y saber exactamente qué hacer hoy |
| Completar los 4 hábitos | Perfect Day x2 bonus + toast motivacional + avance en cinturón |
| Domingo check-in | 30 segundos para registrar peso + reflexión. Ver semáforos de la semana |
| Canjear un permitido | "Me gané esta pizza" — sin culpa, con datos |
| Subir de cinturón | Momento de celebración real por acumulación de consistencia |
| Terminar un ciclo de 4 semanas | Ver el heatmap completo, los semáforos, la reflexión. Orgullo tangible |
| BJJ post-entrenamiento | Registrar técnicas y notas en 60 seg → BJJ journal crece solo |
| Nuevo PR en gym | Registrar + ver progresión → "estoy más fuerte que el mes pasado" |
| Compartir progreso | PNG con score + nivel + streak → WhatsApp al grupo de amigos |

**Métrica de magia:** El día que Mati abre Brim Hub antes que Instagram a la mañana es el día que ganamos.

---

## 2. FEATURE MAP: LO QUE EXISTE HOY (v1)

### 2.1 Dashboard ("Hoy")
- ✅ Score diario (% de hábitos completos)
- ✅ Créditos (puntos disponibles para canjear)
- ✅ Racha (días consecutivos)
- ✅ Barra de nivel (cinturón actual → próximo)
- ✅ Macros del día (calorías, proteína, carbs, grasa vs targets)
- ✅ Lista de hábitos con cues de Atomic Habits
- ✅ Botón Compartir (PNG export)

### 2.2 Hábitos
- ✅ Agua: +250ml / +500ml con progress bar hacia 2.5L
- ✅ Pasos: +1000 / +5000 con progress bar hacia 10,000
- ✅ BJJ: Toggle + mini-form (Gi/No-Gi, duración, técnicas, notas)
- ✅ Gym: Toggle completo/no
- ✅ Comida: Form manual (tipo de comida, descripción, kcal, proteína, carbs, grasa)
- ✅ Energía: Picker 1-5 (😴→🔥)

### 2.3 Permitidos
- ✅ Balance de puntos (ganados - gastados)
- ✅ Catálogo de 8 permitidos (pizza, birra, chocolate, helado, gaming, comida chatarra, fernet, día libre)
- ✅ Canje con confirmación
- ✅ Historial de canjes

### 2.4 Progreso
- ✅ Heatmap 28 días (contribution graph estilo GitHub)
- ✅ Ciclos de 4 semanas con semáforos semanales (🟢🟡🔴)
- ✅ Weight trend (últimos 5 registros + diferencia)
- ✅ BJJ Journal (sesiones del mes con metadata)
- ✅ Gym PRs (por ejercicio, progresión, custom exercises)

### 2.5 Perfil
- ✅ Nivel actual (cinturón + badge)
- ✅ Input de peso diario
- ✅ Targets editables (calorías, proteína, carbs, grasa, agua, pasos, BJJ, gym)

### 2.6 Check-in Semanal
- ✅ Banner dominical automático
- ✅ Resumen de la semana
- ✅ Input de peso (obligatorio)
- ✅ Reflexión (opcional)

### 2.7 Share
- ✅ PNG export con score, nivel, streak, créditos, hábitos, ciclo activo
- ✅ Web Share API (mobile) + download fallback (desktop)

---

## 3. GAP ANALYSIS: LO QUE FALTA

### 3.1 Features No Construidas (del PLAN.md original)

| Feature | Priority | Effort | Impact | Status |
|---------|----------|--------|--------|--------|
| Claude AI para food logging (parsear "comí milanesas con ensalada") | P1 | 1 semana | ALTO — elimina fricción #1 del tracking de comida | ❌ |
| Gym routines (rutinas generadas por AI) | P2 | 1 semana | MEDIO — complementa PRs con estructura | ❌ |
| Chat con Claude (coach personal) | P2 | 1 semana | ALTO — consejero 24/7 que conoce tu data | ❌ |
| Offline support mejorado (sync queue) | P3 | 3 días | MEDIO — PWA ya funciona, pero pierde data offline | ❌ |
| Permitidos custom (agregar tus propios) | P3 | 2 días | BAJO — los 8 actuales cubren el 90% | ❌ |
| Notificaciones push | P2 | 3 días | ALTO — recordatorios de agua, check-in | ❌ |

### 3.2 Features Nuevas Identificadas (Post-Launch)

| Feature | Priority | Effort | Impact | Rationale |
|---------|----------|--------|--------|-----------|
| AI food parsing ("comí un Big Mac") → auto macros | P1 | 1 sem | MUY ALTO | Elimina la barrera #1: loggear comida manualmente es tedioso |
| AI coach (chat contextual con tu data) | P1 | 1 sem | MUY ALTO | Preguntarle "¿cómo vengo esta semana?" con data real |
| Weekly digest (resumen automático vía AI) | P1 | 3 días | ALTO | Reemplaza check-in manual con insights generados |
| Sugerencias AI post-ciclo | P2 | 3 días | ALTO | "Tu próximo ciclo debería enfocarse en X porque..." |
| Integración Apple Health (pasos automáticos) | P2 | 1 sem | MUY ALTO | Elimina input manual de pasos → más adherencia |
| Integración con wearable (Apple Watch) | P3 | 2 sem | ALTO | Agua + pasos automáticos |
| Multi-user support | P3 | 1 sem | MEDIO | Si alguien más quiere usar la app |
| Dark mode | P3 | 2 días | BAJO | Nice-to-have estético |
| Trends avanzados (gráficos de línea, correlaciones) | P2 | 1 sem | MEDIO | "Cuando entreno BJJ duermo mejor" |
| Micro-journaling diario | P2 | 3 días | MEDIO | 1 línea por día → pattern recognition con AI |

---

## 4. PRIORIZACIÓN: ROADMAP v2

### Criterio: Impacto en adherencia × Esfuerzo de build

### Fase 2A: AI Layer (Semanas 1-2)
**Theme:** Hacer que la AI conozca tu data y te ayude.

| Task | Effort | Output |
|------|--------|--------|
| Integrar Claude API (Anthropic SDK) | 2 días | API route + streaming chat |
| AI food parsing: "comí milanesas" → {kcal: 650, protein: 35, carbs: 40, fat: 30} | 3 días | Reemplaza form manual por chat natural |
| AI coach chat: preguntale sobre tu progreso, ciclos, hábitos | 3 días | Chat page funcional con contexto de tus datos |
| Weekly AI digest: resumen automático del check-in | 2 días | Genera insight semanal sin que tengas que escribir |

**Entregable:** Abrir Brim Hub → tab Chat → "¿Cómo vengo esta semana?" → respuesta con datos reales. Logear comida con lenguaje natural.

### Fase 2B: Engagement & Polish (Semanas 3-4)
**Theme:** Hacer que vuelvas todos los días.

| Task | Effort | Output |
|------|--------|--------|
| Push notifications (service worker) | 3 días | Recordatorio de agua AM, check-in DOM |
| Micro-journal diario (1 línea) | 2 días | Input simple en Dashboard, AI analiza patterns |
| Sugerencia AI post-ciclo | 2 días | Al cerrar ciclo → "Tu próximo ciclo debería..." |
| Trends avanzados (gráficos línea peso, macros) | 3 días | Progreso visual en /progress |
| Mejoras UX (animaciones, transiciones, feedback táctil) | 2 días | App se siente más "native" |

**Entregable:** App que te recuerda, te motiva, y te muestra progreso visual claro.

### Fase 2C: Automación (Semanas 5-6)
**Theme:** Reducir fricción al mínimo.

| Task | Effort | Output |
|------|--------|--------|
| Apple Health sync (pasos automáticos) | 1 sem | Sin input manual de pasos |
| Gym routine generator (AI) | 3 días | "Generame una rutina de fuerza" → programa completo |
| Offline sync queue (PWA mejorado) | 3 días | Data se guarda local y syncea cuando hay wifi |
| Permitidos custom | 1 día | Agregar tus propios permitidos |

**Entregable:** La app trackea pasos sola, genera rutinas, funciona sin internet.

---

## 5. SISTEMA DE PUNTOS & GAMIFICACIÓN (Diseño Detallado)

### 5.1 Economía de Puntos

```
HÁBITO          PUNTOS BASE    NOTAS
Agua (2.5L)     5 pts          Solo si llega al target
Pasos (10K)     10 pts         Solo si llega al target
BJJ             20 pts         Por sesión (máximo 1/día)
Gym             15 pts         Por sesión (máximo 1/día)
Macros OK       10 pts         Reservado — si calorías ±10% del target (v2)

MULTIPLICADORES
Perfect Day     x2             Los 4 hábitos completos → se duplican los puntos del día
Streak 7+       x1.5           7+ días consecutivos → multiplicador en cada hábito
Perfect Week    50 pts bonus   7 perfect days consecutivos (raro pero épico)
```

### 5.2 Streak Logic: "Never Miss Twice"
- Día válido = 1+ hábitos completos al 100% O 2+ hábitos parciales
- La racha se rompe solo en un miss total (0 hábitos)
- Filosofía: permitir días malos sin romper el momentum

### 5.3 Niveles (Cinturones BJJ)

| Nivel | Puntos Mín | Badge | Unlock |
|-------|-----------|-------|--------|
| Cinturón Blanco | 0 | 🤍 | Acceso base |
| Cinturón Azul | 500 | 💙 | ~1 mes de uso consistente |
| Cinturón Violeta | 1,500 | 💜 | ~3 meses |
| Cinturón Marrón | 3,500 | 🤎 | ~6 meses |
| Cinturón Negro | 7,000 | 🖤 | ~1 año de consistencia |

### 5.4 Permitidos (Catálogo de Canjes)

| Permitido | Costo | Emoji |
|-----------|-------|-------|
| Pizza | 30 pts | 🍕 |
| Birra | 15 pts | 🍺 |
| Chocolate | 10 pts | 🍫 |
| Helado | 20 pts | 🍦 |
| Tarde de gaming | 25 pts | 🎮 |
| Comida chatarra | 25 pts | 🍔 |
| Fernet | 20 pts | 🥃 |
| Día libre total | 50 pts | 😴 |

---

## 6. MÉTRICAS DE ÉXITO

### North Star Metric
**Días activos por semana (≥1 hábito loggeado)**
- Target: 6/7 días/semana de uso activo
- Medición: COUNT(DISTINCT date) WHERE habit_logs has entries, por semana

### Métricas Secundarias

| Métrica | Baseline (hoy) | Target v2 | Cómo Medir |
|---------|----------------|-----------|------------|
| Días activos/semana | ~3-4 | 6+ | habit_logs por semana |
| Comidas loggeadas/día | ~1 | 3+ | food_logs por día |
| Check-in semanal completado | ~50% | 90%+ | weight_logs domingos |
| Ciclos completados (no abandonados) | 0/1 | 3/4 | cycles status='completed' |
| Permitidos canjeados/mes | ~2 | 4+ | redeems por mes (señal de engagement) |
| BJJ sesiones loggeadas/semana | ~1 | 2 | habit_logs type='bjj' |
| Tiempo en app/sesión | ??? | >2 min | No medido aún (agregar events) |
| Streak promedio | ~3 días | 14+ días | pointsStore streak |

### Success Criteria para v2
1. **Food logging con AI:** ≥3 comidas/día loggeadas (vs ~1 actual con form manual)
2. **Chat AI:** ≥3 interacciones/semana con el coach
3. **Streaks:** Promedio de streak ≥14 días (vs ~3-5 actual)
4. **Ciclos:** 3 de 4 ciclos completados (no abandonados a mitad)

---

## 7. RIESGOS

### Risk 1: No uso la app consistentemente
- **Probabilidad:** ALTA (historia de abandonar apps)
- **Impacto:** TODO (app sin uso = desperdicio)
- **Mitigación:**
  - Push notifications (AM: agua, PM: check-in)
  - AI coach que nota si no loggeaste: "Ey, no te vi hoy"
  - Reducir fricción: food parsing con AI, pasos automáticos
  - Streaks visibles + loss aversion (no quiero perder racha)

### Risk 2: AI food parsing no es preciso
- **Probabilidad:** MEDIA (LLMs son buenos en esto pero no perfectos)
- **Impacto:** MEDIO (macros incorrectos → targets sin sentido)
- **Mitigación:**
  - Mostrar estimación + permitir editar
  - Log de confianza: "~650 kcal (estimado)"
  - Mejorar con feedback: thumbs up/down en cada estimación

### Risk 3: Scope creep (agregar features sin usar las existentes)
- **Probabilidad:** ALTA (tendencia natural)
- **Impacto:** MEDIO (complejidad sin valor)
- **Mitigación:**
  - Regla: no agregar features hasta que las actuales tengan uso consistente
  - Métricas definen prioridad, no ideas

---

## 8. DECISIONES ARQUITECTÓNICAS

| Decisión | Elegido | Alternativa | Por Qué |
|----------|---------|-------------|---------|
| Framework | Vite + React | Next.js | App personal, no necesita SSR. Vite es más rápido |
| State | Zustand | Redux, Context | Minimal, async-friendly, zero boilerplate |
| Backend | Supabase | Firebase | Postgres > Firestore para queries. pgvector para AI |
| Auth | Sin auth (hardcoded ID) | Supabase Auth | Un solo usuario. Complejidad innecesaria |
| AI | Claude (Anthropic) | GPT-4o | Mejor razonamiento, tool use, consistencia |
| Deploy | Vercel | Netlify | Fast, free, preview deploys |
| PWA | vite-plugin-pwa | Capacitor | Web-first, installable sin app store |
| Food tracking | Manual (v1) → AI (v2) | API de nutrición | AI es más flexible ("comí 2 empanadas de carne") |

---

## 9. CONSTRAINTS

- **1 developer (Mati + Cursor):** Scope ajustado, no features que requieran >1 semana
- **No backend custom:** Todo en Supabase (Edge Functions para AI en v2)
- **No app store:** PWA solamente. Limitaciones de iOS (no push en Safari <16.4, no background sync)
- **Budget AI:** ~$20-50/month (estimado para uso personal con Claude)
- **Single user:** No multi-tenant, no RLS real, no collaboration features

---

## 10. VISIÓN A 6 MESES

**Mes 1-2:** AI Layer live (food parsing + coach chat + weekly digest)
**Mes 3:** Apple Health sync + push notifications + trends avanzados
**Mes 4:** Gym routines AI + offline mejorado
**Mes 5-6:** Multi-user (si otros quieren usar) + dark mode + refinamiento

**En 6 meses, Brim Hub debería ser:** La app que Mati abre primero cada mañana. Donde loggea comida hablando, ve su progreso real, y tiene un coach AI que lo conoce mejor que cualquier app genérica. El cinturón negro no es un badge — es evidencia de un año de consistencia.

---

*Documento firmado: Matías Bodino*
*Fecha: Abril 2026*
*Status: READY TO BUILD v2*

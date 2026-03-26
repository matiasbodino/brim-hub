# Brim Hub — Implementation Plan

**Overall Progress:** `15%`

## TLDR
App personal de bienestar y progreso para Mati. Ciclos con objetivos medibles, tracking de hábitos (agua, pasos, BJJ, gym), sistema de permitidos gamificado con puntos/niveles, PRs de gym, BJJ journal, y check-in semanal. Mobile-first PWA.

## Critical Decisions
- **Sin auth** — app personal, acceso directo sin login. User ID hardcodeado.
- **RLS abierta** — policies permisivas. Riesgo bajo (app personal).
- **Sin Claude en v1** — food logging manual, rutinas de gym manuales. Claude en v2.
- **Paleta** — blanco + violeta (#7C3AED)
- **Ciclos = Cumbres personales** — períodos de 4 semanas con targets y evaluación.
- **Economía de puntos** — hábitos dan puntos, se canjean por permitidos.
- **Niveles BJJ** — Blanco → Azul → Violeta → Marrón → Negro por puntos acumulados.

## Navegación
| Tab | Pantalla | Qué hace |
|-----|----------|----------|
| 🏠 | Hoy | Score del día, hábitos, créditos, streak, nivel |
| 💪 | Hábitos | Agua, Pasos, BJJ (mini-form), Gym (toggle), Comida (simple) |
| 🎁 | Permitidos | Balance de créditos, catálogo de canjes, historial |
| 📈 | Progreso | Ciclo actual, heatmap, peso, PRs, BJJ journal |
| 👤 | Perfil | Targets, nivel/rango, check-in semanal, ciclos pasados |

## Economía de puntos
| Hábito | Puntos |
|--------|--------|
| Agua completada | 5 |
| Pasos completados | 10 |
| BJJ sesión | 20 |
| Gym sesión | 15 |
| Kcal en rango | 10 |
| Día perfecto (todos) | x2 bonus |
| Semana perfecta | +50 bonus |
| Streak 7+ días | x1.5 multiplicador |

## Niveles
| Nivel | Puntos acumulados | Badge |
|-------|-------------------|-------|
| Cinturón Blanco | 0 | 🤍 |
| Cinturón Azul | 500 | 💙 |
| Cinturón Violeta | 1500 | 💜 |
| Cinturón Marrón | 3500 | 🤎 |
| Cinturón Negro | 7000 | 🖤 |

## Tasks:

- [x] 🟩 **Step 1: Setup proyecto**
  - [x] 🟩 Vite + React + Tailwind + Zustand
  - [x] 🟩 Supabase client + schema SQL
  - [x] 🟩 PWA plugin + deploy Vercel

- [x] 🟩 **Step 2: Layout base**
  - [x] 🟩 Bottom nav + rutas + app shell mobile-first

- [ ] 🟥 **Step 3: Cleanup + constantes**
  - [ ] 🟥 Extraer targets/habits a `src/lib/constants.js`
  - [ ] 🟥 Fix timezone en foodStore
  - [ ] 🟥 Error handling en stores
  - [ ] 🟥 Quitar auth/login residual (botón cerrar sesión, Login.jsx)

- [ ] 🟥 **Step 4: Hábitos mejorados**
  - [ ] 🟥 Agua: incremento por vaso con botones (+250ml, +500ml)
  - [ ] 🟥 Pasos: input manual (+1000, +5000)
  - [ ] 🟥 BJJ mini-form: Gi/No-Gi, duración, técnicas trabajadas, notas
  - [ ] 🟥 Gym: toggle hecho + opción de cargar ejercicios/PRs
  - [ ] 🟥 Comida: formulario simple (tipo, descripción, kcal estimadas, proteína)

- [ ] 🟥 **Step 5: Sistema de puntos + permitidos**
  - [ ] 🟥 Tabla `points_log` (user_id, date, source, points, created_at)
  - [ ] 🟥 Tabla `redeems` (user_id, item, cost, redeemed_at)
  - [ ] 🟥 Cálculo automático de puntos al completar hábito
  - [ ] 🟥 Bonus día perfecto (x2) y semana perfecta (+50)
  - [ ] 🟥 Streak multiplier (7+ días = x1.5)
  - [ ] 🟥 Pantalla Permitidos: balance, catálogo de canjes editable, historial
  - [ ] 🟥 Cálculo de nivel basado en puntos totales acumulados (no canjeados)

- [ ] 🟥 **Step 6: Ciclos (Cumbres personales)**
  - [ ] 🟥 Tabla `cycles` (id, name, start_date, end_date, targets JSONB, status)
  - [ ] 🟥 Crear ciclo: nombre, duración (semanas), targets por hábito
  - [ ] 🟥 KPIs del ciclo con semáforo semanal (verde >80%, amarillo 50-80%, rojo <50%)
  - [ ] 🟥 Barra de progreso + bandera al completar ciclo
  - [ ] 🟥 Historial de ciclos pasados en Perfil

- [ ] 🟥 **Step 7: Progreso + Dashboard mejorado**
  - [ ] 🟥 Heatmap tipo GitHub (cuadraditos por día, color por score)
  - [ ] 🟥 Peso semanal: input + gráfico de tendencia
  - [ ] 🟥 PRs de gym: registrar máximos por ejercicio + historial de progresión
  - [ ] 🟥 BJJ journal: historial de sesiones con filtros (Gi/No-Gi, técnicas)
  - [ ] 🟥 Toggle ciclo actual vs acumulado
  - [ ] 🟥 Streaks por hábito con mejor racha

- [ ] 🟥 **Step 8: Check-in semanal**
  - [ ] 🟥 Notificación/reminder cada domingo
  - [ ] 🟥 Formulario: peso, reflexión ("qué salió bien", "qué ajusto")
  - [ ] 🟥 Se acumula en historial

- [ ] 🟥 **Step 9: Compartir progreso**
  - [ ] 🟥 Botón 📷 en Progreso que genera imagen PNG del ciclo
  - [ ] 🟥 Card con: nombre del ciclo, KPIs semáforo, streak, nivel, stats
  - [ ] 🟥 Descarga para mandar por WhatsApp/historias

- [ ] 🟥 **Step 10: Perfil completo**
  - [ ] 🟥 Targets editables por ciclo
  - [ ] 🟥 Nivel y rango visible con badge
  - [ ] 🟥 Permitidos custom (agregar/editar canjes propios)
  - [ ] 🟥 Historial de ciclos con resultados

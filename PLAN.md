# Brim Hub — Implementation Plan

**Overall Progress:** `50%`

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

## Tasks:

- [x] 🟩 **Step 1: Setup proyecto**
  - [x] 🟩 Vite + React + Tailwind + Zustand
  - [x] 🟩 Supabase client + schema SQL
  - [x] 🟩 PWA plugin + deploy Vercel

- [x] 🟩 **Step 2: Layout base**
  - [x] 🟩 Bottom nav 5 tabs (Hoy, Hábitos, Permitidos, Progreso, Perfil)
  - [x] 🟩 Rutas con react-router-dom
  - [x] 🟩 App shell mobile-first (max-w-lg)

- [x] 🟩 **Step 3: Cleanup + constantes**
  - [x] 🟩 `src/lib/constants.js` con targets, habits, points, levels, permitidos
  - [x] 🟩 Fix timezone en foodStore (Argentina UTC-3)
  - [x] 🟩 Error handling en stores
  - [x] 🟩 Auth removido (sin login, acceso directo)

- [x] 🟩 **Step 4: Hábitos mejorados**
  - [x] 🟩 Agua: +250ml, +500ml
  - [x] 🟩 Pasos: +1000, +5000
  - [x] 🟩 BJJ mini-form: Gi/No-Gi, duración, técnicas, notas (metadata JSONB)
  - [x] 🟩 Gym: toggle hecho
  - [x] 🟩 Comida: formulario simple (tipo, descripción, kcal, proteína)

- [x] 🟩 **Step 5: Sistema de puntos + permitidos**
  - [x] 🟩 Tabla `points_log` + `redeems`
  - [x] 🟩 Puntos automáticos al completar hábito
  - [x] 🟩 Perfect day bonus (x2)
  - [x] 🟩 Streak multiplier (7+ días = x1.5)
  - [x] 🟩 Pantalla Permitidos: balance, catálogo, historial de canjes
  - [x] 🟩 Niveles (Cinturón Blanco → Negro) por puntos acumulados

- [ ] 🟥 **Step 6: Ciclos (Cumbres personales)**
  - [ ] 🟥 Tabla `cycles` (id, name, start_date, end_date, targets JSONB, status)
  - [ ] 🟥 Crear ciclo: nombre, duración, targets por hábito
  - [ ] 🟥 KPIs del ciclo con semáforo semanal
  - [ ] 🟥 Barra de progreso + bandera al completar
  - [ ] 🟥 Historial de ciclos pasados en Perfil

- [ ] 🟥 **Step 7: Progreso mejorado**
  - [x] 🟩 Heatmap 28 días
  - [x] 🟩 Peso: trend últimos 5 registros + diferencia
  - [x] 🟩 BJJ journal: sesiones del mes con detalle
  - [ ] 🟥 PRs de gym: registrar máximos + progresión
  - [ ] 🟥 Toggle ciclo actual vs acumulado
  - [ ] 🟥 Streaks por hábito con mejor racha

- [ ] 🟥 **Step 8: Check-in semanal**
  - [ ] 🟥 Formulario dominical: peso, reflexión
  - [ ] 🟥 Historial acumulado

- [ ] 🟥 **Step 9: Compartir progreso**
  - [ ] 🟥 Botón 📷 genera PNG del ciclo/stats
  - [ ] 🟥 Descarga para WhatsApp/historias

- [ ] 🟥 **Step 10: Perfil completo**
  - [x] 🟩 Nivel y badge visible
  - [x] 🟩 Input de peso
  - [x] 🟩 Targets visibles desde constants
  - [ ] 🟥 Targets editables
  - [ ] 🟥 Permitidos custom
  - [ ] 🟥 Historial de ciclos

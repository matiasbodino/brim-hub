import { callClaude } from "../_shared/anthropic.ts";

const MATI_ID = "c17e4105-4861-43c8-bf13-0d32f7818418";
const SB_URL = "https://birpqzahbtfbxxtaqeth.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5MTE4MywiZXhwIjoyMDkwMDY3MTgzfQ.k8tjbC_fcUv34cPwo2Vcewu3eUe7GDjyOy3B9f9Jtnk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function query(table: string, params: string): Promise<unknown[]> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return [];
  return await res.json();
}

async function upsertRow(table: string, body: Record<string, unknown>, onConflict: string): Promise<void> {
  await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
}

async function insertRow(table: string, body: Record<string, unknown>): Promise<void> {
  await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

// ─── Types ───

interface HabitLog { date: string; habit_type: string; value: number; target: number; completion_type: string }
interface FoodLog { logged_at: string; meal_type: string; description: string; calories: number; protein: number; carbs: number; fat: number }
interface WeightLog { date: string; weight: number }
interface EnergyLog { date: string; energy_level: number }
interface JournalEntry { date: string; content: string; mood: number | null }
interface PointLog { date: string; source: string; points: number }
interface Redeem { item: string; cost: number; redeemed_at: string }

interface Stats {
  habitsByDayOfWeek: Record<string, Record<string, { completed: number; total: number; rate: number }>>;
  habitsByEnergyLevel: Record<number, Record<string, { completed: number; total: number; rate: number }>>;
  topFoods: { description: string; count: number; avgCalories: number; avgProtein: number }[];
  macrosByDayOfWeek: Record<string, { avgCalories: number; avgProtein: number; meals: number }>;
  weightTrend: { first: number; last: number; delta: number; ratePerWeek: number; direction: string } | null;
  streakStats: { avgLength: number; maxLength: number; breakDays: Record<string, number> };
  loggingPatterns: { avgMealsPerDay: number; daysWithoutLogs: number; missingDays: string[] };
  energyByDayOfWeek: Record<string, number>;
  energyVsProtein: { highProteinDays: { avgEnergy: number; count: number }; lowProteinDays: { avgEnergy: number; count: number }; correlation: string };
  weightVsCalories: { weightGoingUp: boolean; caloriesOnTarget: boolean; suspectedUnderreport: boolean; avgLoggedCal: number; weightDelta: number; details: string } | null;
  totalActiveDays: number;
  totalDaysInRange: number;
}

// ─── Stats Calculation ───

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function getDayName(dateStr: string): string {
  return DAYS[new Date(dateStr + 'T12:00:00').getDay()];
}

function calculateStats(
  habits: HabitLog[],
  food: FoodLog[],
  weights: WeightLog[],
  energy: EnergyLog[],
  _journal: JournalEntry[],
  _points: PointLog[],
  _redeems: Redeem[],
  totalDaysInRange: number,
): Stats {
  // ── habitsByDayOfWeek ──
  const habitsByDow: Stats['habitsByDayOfWeek'] = {};
  for (const h of habits) {
    const day = getDayName(h.date);
    if (!habitsByDow[day]) habitsByDow[day] = {};
    if (!habitsByDow[day][h.habit_type]) habitsByDow[day][h.habit_type] = { completed: 0, total: 0, rate: 0 };
    habitsByDow[day][h.habit_type].total++;
    if (h.completion_type === 'full') habitsByDow[day][h.habit_type].completed++;
  }
  for (const day of Object.keys(habitsByDow)) {
    for (const type of Object.keys(habitsByDow[day])) {
      const s = habitsByDow[day][type];
      s.rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    }
  }

  // ── habitsByEnergyLevel ──
  const energyByDate: Record<string, number> = {};
  for (const e of energy) energyByDate[e.date] = e.energy_level;

  const habitsByEnergy: Stats['habitsByEnergyLevel'] = {};
  for (const h of habits) {
    const lvl = energyByDate[h.date];
    if (!lvl) continue;
    if (!habitsByEnergy[lvl]) habitsByEnergy[lvl] = {};
    if (!habitsByEnergy[lvl][h.habit_type]) habitsByEnergy[lvl][h.habit_type] = { completed: 0, total: 0, rate: 0 };
    habitsByEnergy[lvl][h.habit_type].total++;
    if (h.completion_type === 'full') habitsByEnergy[lvl][h.habit_type].completed++;
  }
  for (const lvl of Object.keys(habitsByEnergy)) {
    for (const type of Object.keys(habitsByEnergy[Number(lvl)])) {
      const s = habitsByEnergy[Number(lvl)][type];
      s.rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    }
  }

  // ── topFoods ──
  const foodMap: Record<string, { count: number; totalCal: number; totalProt: number }> = {};
  for (const f of food) {
    const key = (f.description || '').toLowerCase().trim();
    if (!key) continue;
    if (!foodMap[key]) foodMap[key] = { count: 0, totalCal: 0, totalProt: 0 };
    foodMap[key].count++;
    foodMap[key].totalCal += f.calories || 0;
    foodMap[key].totalProt += Number(f.protein || 0);
  }
  const topFoods = Object.entries(foodMap)
    .map(([desc, v]) => ({
      description: desc,
      count: v.count,
      avgCalories: Math.round(v.totalCal / v.count),
      avgProtein: Math.round(v.totalProt / v.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // ── macrosByDayOfWeek ──
  const macrosDow: Record<string, { totalCal: number; totalProt: number; days: Set<string> }> = {};
  for (const f of food) {
    const day = getDayName(f.logged_at.slice(0, 10));
    const dateKey = f.logged_at.slice(0, 10);
    if (!macrosDow[day]) macrosDow[day] = { totalCal: 0, totalProt: 0, days: new Set() };
    macrosDow[day].totalCal += f.calories || 0;
    macrosDow[day].totalProt += Number(f.protein || 0);
    macrosDow[day].days.add(dateKey);
  }
  const macrosByDayOfWeek: Stats['macrosByDayOfWeek'] = {};
  for (const [day, v] of Object.entries(macrosDow)) {
    const n = v.days.size;
    macrosByDayOfWeek[day] = {
      avgCalories: n > 0 ? Math.round(v.totalCal / n) : 0,
      avgProtein: n > 0 ? Math.round(v.totalProt / n) : 0,
      meals: n,
    };
  }

  // ── weightTrend ──
  let weightTrend: Stats['weightTrend'] = null;
  if (weights.length >= 2) {
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0].weight;
    const last = sorted[sorted.length - 1].weight;
    const delta = Number((last - first).toFixed(1));
    const daySpan = Math.max(1, Math.round((new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000));
    const ratePerWeek = Number((delta / daySpan * 7).toFixed(2));
    weightTrend = { first, last, delta, ratePerWeek, direction: delta < 0 ? 'bajando' : delta > 0 ? 'subiendo' : 'estable' };
  }

  // ── streakStats ──
  const activeDatesSet = new Set<string>();
  for (const h of habits) {
    if (h.completion_type === 'full') activeDatesSet.add(h.date);
  }
  const sortedDates = [...activeDatesSet].sort();
  const streaks: number[] = [];
  const breakDays: Record<string, number> = {};
  let currentStreak = 0;

  if (sortedDates.length > 0) {
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
      const curr = new Date(sortedDates[i] + 'T12:00:00');
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        currentStreak++;
      } else {
        streaks.push(currentStreak);
        // The day after the last active day is the break day
        const breakDate = new Date(prev);
        breakDate.setDate(breakDate.getDate() + 1);
        const breakDayName = DAYS[breakDate.getDay()];
        breakDays[breakDayName] = (breakDays[breakDayName] || 0) + 1;
        currentStreak = 1;
      }
    }
    streaks.push(currentStreak);
  }

  const avgLength = streaks.length > 0 ? Math.round(streaks.reduce((a, s) => a + s, 0) / streaks.length * 10) / 10 : 0;
  const maxLength = streaks.length > 0 ? Math.max(...streaks) : 0;

  // ── loggingPatterns ──
  const foodDates = new Set(food.map(f => f.logged_at.slice(0, 10)));
  const allDates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() - totalDaysInRange);
  for (let i = 0; i <= totalDaysInRange; i++) {
    d.setDate(d.getDate() + 1);
    allDates.push(d.toISOString().slice(0, 10));
  }
  const missingDays = allDates.filter(date => !foodDates.has(date) && !activeDatesSet.has(date));
  const avgMealsPerDay = foodDates.size > 0 ? Math.round(food.length / foodDates.size * 10) / 10 : 0;

  // ── energyByDayOfWeek ──
  const energyDow: Record<string, { total: number; count: number }> = {};
  for (const e of energy) {
    const day = getDayName(e.date);
    if (!energyDow[day]) energyDow[day] = { total: 0, count: 0 };
    energyDow[day].total += e.energy_level;
    energyDow[day].count++;
  }
  const energyByDayOfWeek: Record<string, number> = {};
  for (const [day, v] of Object.entries(energyDow)) {
    energyByDayOfWeek[day] = Math.round(v.total / v.count * 10) / 10;
  }

  // ── energyVsProtein — do high-protein days have higher perceived energy? ──
  const foodByDate: Record<string, { calories: number; protein: number }> = {};
  for (const f of food) {
    const d = f.logged_at.slice(0, 10);
    if (!foodByDate[d]) foodByDate[d] = { calories: 0, protein: 0 };
    foodByDate[d].calories += f.calories || 0;
    foodByDate[d].protein += Number(f.protein || 0);
  }

  const proteinThreshold = 100; // grams
  const highProtDays: number[] = [];
  const lowProtDays: number[] = [];
  for (const e of energy) {
    const dayFood = foodByDate[e.date];
    if (!dayFood) continue;
    if (dayFood.protein >= proteinThreshold) {
      highProtDays.push(e.energy_level);
    } else {
      lowProtDays.push(e.energy_level);
    }
  }
  const avgHighProt = highProtDays.length > 0 ? Math.round(highProtDays.reduce((a, v) => a + v, 0) / highProtDays.length * 10) / 10 : 0;
  const avgLowProt = lowProtDays.length > 0 ? Math.round(lowProtDays.reduce((a, v) => a + v, 0) / lowProtDays.length * 10) / 10 : 0;
  const protCorrelation = highProtDays.length >= 3 && lowProtDays.length >= 3
    ? (avgHighProt > avgLowProt + 0.5 ? 'positive' : avgLowProt > avgHighProt + 0.5 ? 'negative' : 'neutral')
    : 'insufficient_data';

  const energyVsProtein = {
    highProteinDays: { avgEnergy: avgHighProt, count: highProtDays.length },
    lowProteinDays: { avgEnergy: avgLowProt, count: lowProtDays.length },
    correlation: protCorrelation,
  };

  // ── weightVsCalories — is weight going up while logged calories look on-target? ──
  let weightVsCalories: Stats['weightVsCalories'] = null;
  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedWeights.length >= 3 && Object.keys(foodByDate).length >= 7) {
    const recentWeights = sortedWeights.slice(-5);
    const wDelta = recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight;
    const weightGoingUp = wDelta > 0.3; // more than 300g up

    const foodDaysArr = Object.values(foodByDate);
    const avgLoggedCal = foodDaysArr.length > 0 ? Math.round(foodDaysArr.reduce((a, d) => a + d.calories, 0) / foodDaysArr.length) : 0;
    const caloriesOnTarget = avgLoggedCal <= 2200 && avgLoggedCal >= 1600; // within reasonable range

    const suspectedUnderreport = weightGoingUp && caloriesOnTarget;

    let details: string;
    if (suspectedUnderreport) {
      details = `Peso subió ${wDelta.toFixed(1)}kg pero las calorías loggeadas promedian ${avgLoggedCal} kcal/día (dentro del target). Posible subestimación de porciones o aderezos no loggeados.`;
    } else if (weightGoingUp && !caloriesOnTarget) {
      details = `Peso subió ${wDelta.toFixed(1)}kg y las calorías promedian ${avgLoggedCal} kcal/día — el exceso calórico explica la suba.`;
    } else {
      details = `Peso ${wDelta >= 0 ? 'estable' : 'bajando'} (${wDelta.toFixed(1)}kg), calorías promedio ${avgLoggedCal} kcal/día.`;
    }

    weightVsCalories = { weightGoingUp, caloriesOnTarget, suspectedUnderreport, avgLoggedCal, weightDelta: Number(wDelta.toFixed(1)), details };
  }

  return {
    habitsByDayOfWeek: habitsByDow,
    habitsByEnergyLevel: habitsByEnergy,
    topFoods,
    macrosByDayOfWeek,
    weightTrend,
    streakStats: { avgLength, maxLength, breakDays },
    loggingPatterns: { avgMealsPerDay, daysWithoutLogs: missingDays.length, missingDays: missingDays.slice(-10) },
    energyByDayOfWeek,
    energyVsProtein,
    weightVsCalories,
    totalActiveDays: activeDatesSet.size,
    totalDaysInRange,
  };
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const since = ninetyDaysAgo.toISOString().slice(0, 10);
    const enc = encodeURIComponent;

    // ── Step 1: Parallel data fetch ──
    const [habits, food, weights, energy, journal, points, redeems] = await Promise.all([
      query("habit_logs", `select=date,habit_type,value,target,completion_type&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(since)}&order=date.asc`) as Promise<HabitLog[]>,
      query("food_logs", `select=logged_at,meal_type,description,calories,protein,carbs,fat&user_id=eq.${enc(MATI_ID)}&logged_at=gte.${enc(since + "T00:00:00-03:00")}&order=logged_at.asc`) as Promise<FoodLog[]>,
      query("weight_logs", `select=date,weight&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(since)}&order=date.asc`) as Promise<WeightLog[]>,
      query("daily_logs", `select=date,energy_level&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(since)}&order=date.asc`) as Promise<EnergyLog[]>,
      query("weight_logs", `select=date,notes&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(since)}&notes=not.is.null&order=date.asc`) as Promise<JournalEntry[]>,
      query("points_log", `select=date,source,points&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(since)}`) as Promise<PointLog[]>,
      query("redeems", `select=item,cost,redeemed_at&user_id=eq.${enc(MATI_ID)}&order=redeemed_at.desc&limit=20`) as Promise<Redeem[]>,
    ]);

    // ── Step 2: Calculate stats ──
    const stats = calculateStats(habits, food, weights, energy, journal, points, redeems, 90);

    // ── Step 3: Generate insights with Claude ──
    const insightsRaw = await callClaude(
      `Sos un analista de datos de bienestar personal. Te doy estadísticas calculadas de los últimos 90 días de un usuario argentino. Generá insights accionables en formato JSON array.

Cada insight debe tener:
- type: 'correlation' | 'food_preference' | 'behavior_pattern' | 'trend' | 'motivation'
- key: identificador único snake_case (ej: 'low_energy_predicts_gym_skip')
- pattern: descripción del patrón descubierto en español (1-2 oraciones)
- suggestion: recomendación accionable específica en español (1 oración)
- confidence: número entre 0 y 1 basado en la evidencia
- evidence_count: cantidad de datos que soportan el insight

Reglas:
- Solo insights con evidencia real (no inventes patrones)
- Mínimo 5 ocurrencias para considerar un patrón válido
- Las sugerencias deben ser específicas al usuario, no genéricas
- PRIORIZAR estos análisis:
  1. energyVsProtein: si hay correlación positiva, generar insight tipo 'correlation' con key 'high_protein_boosts_energy'
  2. weightVsCalories: si suspectedUnderreport=true, generar insight tipo 'trend' con key 'calorie_underreporting_suspected' — ser directo: "Los números dicen que estás en target pero el peso sube; revisemos las porciones"
  3. Correlaciones energía ↔ hábitos por energyLevel (habitsByEnergyLevel)
  4. Patrones temporales (qué día rinde más, qué día rompe racha)
  5. Preferencias alimentarias reales (topFoods)
- Máximo 15 insights
- En español argentino
- Respondé SOLO con el JSON array, sin explicación adicional`,
      JSON.stringify(stats),
      { maxTokens: 2000, temperature: 0.3, model: "claude-sonnet-4-20250514" }
    );

    // Parse insights
    let insights: { type: string; key: string; pattern: string; suggestion: string; confidence: number; evidence_count: number }[] = [];
    try {
      const cleaned = insightsRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse insights JSON:", insightsRaw.slice(0, 200));
      insights = [];
    }

    // ── Step 4: Upsert insights ──
    for (const insight of insights) {
      await upsertRow("user_insights", {
        user_id: MATI_ID,
        insight_type: insight.type,
        insight_key: insight.key,
        insight_value: { pattern: insight.pattern, suggestion: insight.suggestion },
        confidence: insight.confidence,
        evidence_count: insight.evidence_count,
        last_updated: new Date().toISOString(),
        active: true,
      }, "user_id,insight_type,insight_key");
    }

    // ── Step 5: Generate User Model ──
    const userModelContent = await callClaude(
      `Escribí un perfil narrativo de este usuario basado en sus insights y estadísticas. Máximo 500 palabras. En español. Organizado en secciones:

**Quién es** (datos generales: actividad, peso, objetivo)
**Patrones descubiertos** (top 3-4 patrones más importantes, con datos concretos)
**Alimentación** (qué come realmente, promedios, puntos fuertes/débiles)
**Qué funciona para motivarlo** (basado en streaks, recovery, patrones positivos)
**Qué NO funciona** (basado en dropoffs, días malos, patrones negativos)

Sé específico con números. No seas genérico.`,
      `ESTADÍSTICAS (90 días):\n${JSON.stringify(stats, null, 2)}\n\nINSIGHTS GENERADOS:\n${JSON.stringify(insights, null, 2)}`,
      { maxTokens: 1000, temperature: 0.5, model: "claude-sonnet-4-20250514" }
    );

    // Get latest model version
    const existingModels = await query("user_model", `select=model_version&user_id=eq.${enc(MATI_ID)}&order=model_version.desc&limit=1`) as { model_version: number }[];
    const nextVersion = (existingModels.length > 0 ? existingModels[0].model_version : 0) + 1;

    await insertRow("user_model", {
      user_id: MATI_ID,
      model_version: nextVersion,
      model_content: userModelContent,
      token_count: Math.round(userModelContent.length / 4),
      generated_at: new Date().toISOString(),
    });

    // ── Step 6: Response ──
    return new Response(
      JSON.stringify({
        insights_count: insights.length,
        model_version: nextVersion,
        insights: insights.map(i => ({ type: i.type, key: i.key, pattern: i.pattern })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-insights error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

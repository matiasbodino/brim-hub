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
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  return await res.json();
}

async function querySingle(table: string, params: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Accept": "application/vnd.pgrst.object+json" },
  });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

async function upsertRow(table: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

// ─── Adjusted Targets Calculator ───

interface TargetInput {
  baseCalories: number;
  baseProtein: number;
  weeklyWeightTarget: number;
  weekConsumedCalories: number;
  weekDaysElapsed: number;
  baseSteps: number;
}

function calculateAdjustedTargets(input: TargetInput) {
  const weeklyDeficitKcal = Math.abs(input.weeklyWeightTarget) * 7700;
  const weeklyBudget = input.baseCalories * 7 - (input.weeklyWeightTarget < 0 ? weeklyDeficitKcal : -weeklyDeficitKcal);
  const consumed = input.weekConsumedCalories;
  const remainingDays = Math.max(1, 7 - input.weekDaysElapsed);
  const remainingBudget = weeklyBudget - consumed;

  let adjustedCalories = Math.round(remainingBudget / remainingDays);

  const FLOOR = 1400;
  const CEILING = input.baseCalories + 300;
  adjustedCalories = Math.max(FLOOR, Math.min(CEILING, adjustedCalories));

  // If target is low, compensate with extra steps
  const isLowTarget = adjustedCalories < (input.baseCalories - 200);
  const stepsBoost = isLowTarget ? Math.min(5000, Math.round((input.baseCalories - adjustedCalories) * 10)) : 0;
  const adjustedSteps = Math.min(input.baseSteps + stepsBoost, 15000);

  const adjustedProtein = Math.max(input.baseProtein, 150);
  const remainingCals = Math.max(0, adjustedCalories - (adjustedProtein * 4));
  const adjustedCarbs = Math.round((remainingCals * 0.55) / 4);
  const adjustedFat = Math.round((remainingCals * 0.45) / 9);

  const expectedDailyCal = input.weekDaysElapsed > 0 ? input.baseCalories * input.weekDaysElapsed : 0;
  const weekPct = expectedDailyCal > 0 ? (consumed / expectedDailyCal) * 100 : 100;
  const status = weekPct > 110 ? 'over' : weekPct < 90 ? 'under' : 'on_track';

  let reason: string;
  if (status === 'over' && isLowTarget) reason = `Ajustado a ${adjustedCalories} kcal (base ${input.baseCalories}). Te pasaste esta semana — metele ${adjustedSteps >= 12000 ? adjustedSteps.toLocaleString() + ' pasos hoy' : 'actividad extra'} para compensar.`;
  else if (status === 'over') reason = `Ajustado a ${adjustedCalories} kcal (base ${input.baseCalories}). Comiste de más esta semana, compensamos suave.`;
  else if (status === 'under') reason = `${adjustedCalories} kcal hoy. Venís bajo esta semana, podés comer normal.`;
  else reason = `${adjustedCalories} kcal. Vas on track, seguí así.`;

  return {
    calories: adjustedCalories,
    protein: adjustedProtein,
    carbs: adjustedCarbs,
    fat: adjustedFat,
    steps: adjustedSteps,
    water: 2.5,
    status,
    reason,
  };
}

// ─── Time of Day (Argentina) ───

function getTimeOfDay(): 'morning' | 'midday' | 'evening' {
  const now = new Date();
  const argHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })).getHours();
  if (argHour < 14) return 'morning';
  if (argHour < 20) return 'midday';
  return 'evening';
}

function getArgentinaToday(): string {
  const now = new Date();
  const arg = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  return arg.toISOString().slice(0, 10);
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const today = body.date || getArgentinaToday();
    const recalculate = body.recalculate || false;
    const monday = getMondayOfWeek(today);
    const enc = encodeURIComponent;
    const timeOfDay = getTimeOfDay();
    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(today + 'T12:00:00').getDay()];

    // Yesterday for alcohol detection
    const yesterday = (() => {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();

    // ── 3a. Parallel data fetch ──
    const [profile, weekFood, todayFood, todayHabits, todayEnergy, userModelData, foodInsights, existingPlan, yesterdayFood, recentWorkouts, recentEnergy, recentBJJ] = await Promise.all([
      querySingle("user_profile", `select=daily_calorie_target,daily_protein_target,daily_carbs_target,daily_fat_target,daily_water_target,daily_steps_target,weight_goal,weight_goal_date,weekly_weight_target&id=eq.${enc(MATI_ID)}`),
      query("food_logs", `select=calories,protein,carbs,fat,logged_at&user_id=eq.${enc(MATI_ID)}&logged_at=gte.${enc(monday + "T00:00:00-03:00")}&logged_at=lte.${enc(today + "T23:59:59-03:00")}`) as Promise<{calories:number;protein:number;carbs:number;fat:number;logged_at:string}[]>,
      query("food_logs", `select=calories,protein,carbs,fat,meal_type,description,logged_at&user_id=eq.${enc(MATI_ID)}&logged_at=gte.${enc(today + "T00:00:00-03:00")}&logged_at=lte.${enc(today + "T23:59:59-03:00")}`) as Promise<{calories:number;protein:number;carbs:number;fat:number;meal_type:string;description:string;logged_at:string}[]>,
      query("habit_logs", `select=habit_type,value,target,completion_type&user_id=eq.${enc(MATI_ID)}&date=eq.${enc(today)}`) as Promise<{habit_type:string;value:number;target:number;completion_type:string}[]>,
      query("daily_logs", `select=energy_level&user_id=eq.${enc(MATI_ID)}&date=eq.${enc(today)}`) as Promise<{energy_level:number}[]>,
      query("user_model", `select=model_content&user_id=eq.${enc(MATI_ID)}&order=generated_at.desc&limit=1`) as Promise<{model_content:string}[]>,
      query("user_insights", `select=insight_value&user_id=eq.${enc(MATI_ID)}&insight_type=eq.food_preference&active=eq.true`) as Promise<{insight_value:Record<string,string>}[]>,
      querySingle("daily_plans", `select=*&user_id=eq.${enc(MATI_ID)}&date=eq.${enc(today)}`),
      query("food_logs", `select=description&user_id=eq.${enc(MATI_ID)}&logged_at=gte.${enc(yesterday + "T00:00:00-03:00")}&logged_at=lte.${enc(yesterday + "T23:59:59-03:00")}`) as Promise<{description:string}[]>,
      query("workout_logs", `select=rpe,date,duration_min&user_id=eq.${enc(MATI_ID)}&order=date.desc&limit=7`) as Promise<{rpe:number;date:string;duration_min:number}[]>,
      query("daily_logs", `select=date,energy_level&user_id=eq.${enc(MATI_ID)}&order=date.desc&limit=3`) as Promise<{date:string;energy_level:number}[]>,
      query("habit_logs", `select=date,metadata&user_id=eq.${enc(MATI_ID)}&habit_type=eq.bjj&completion_type=eq.full&order=date.desc&limit=7`) as Promise<{date:string;metadata:{duracion?:number;tipo?:string}}[]>,
    ]);

    // ── 3b. Calculate adjusted targets ──
    const baseCalories = Number(profile?.daily_calorie_target) || 2100;
    const baseProtein = Number(profile?.daily_protein_target) || 150;
    const baseSteps = Number(profile?.daily_steps_target) || 10000;
    const weeklyWeightTarget = Number(profile?.weekly_weight_target) || -0.4;

    // Week consumed (exclude today for cleaner calc)
    const yesterdayStr = (() => {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const weekFoodExcludeToday = weekFood.filter(f => f.logged_at.slice(0, 10) < today);
    const weekConsumedCalories = weekFoodExcludeToday.reduce((a, f) => a + (f.calories || 0), 0);
    const weekDaysElapsed = Math.max(0, Math.round((new Date(today + 'T12:00:00').getTime() - new Date(monday + 'T12:00:00').getTime()) / 86400000));

    const adjustedTargets = calculateAdjustedTargets({
      baseCalories, baseProtein, weeklyWeightTarget,
      weekConsumedCalories, weekDaysElapsed, baseSteps,
    });

    // ── Alcohol detection: yesterday's food → "Día de limpieza" ──
    const alcoholKeywords = ['birra', 'cerveza', 'fernet', 'vino', 'alcohol', 'whisky', 'vodka', 'gin', 'ron', 'aperol', 'spritz', 'trago', 'copa', 'pinta'];
    const yesterdayText = (yesterdayFood || []).map(f => (f.description || '').toLowerCase()).join(' ');
    const hadAlcoholYesterday = alcoholKeywords.some(k => yesterdayText.includes(k));

    if (hadAlcoholYesterday) {
      adjustedTargets.water = 3.5;
      adjustedTargets.cleanup_day = true;
      if (!adjustedTargets.reason.includes('limpieza')) {
        adjustedTargets.reason += ' 🧹 Día de limpieza: ayer hubo alcohol, agua a 3.5L.';
      }
    }

    // ── Recovery Engine: training load analysis (duration × RPE) ──
    // Combine gym workouts + BJJ sessions into a unified training load
    const gymWorkouts = (recentWorkouts as {rpe:number;date:string;duration_min:number}[]) || [];
    const bjjSessions = (recentBJJ as {date:string;metadata:{duracion?:number}}[]) || [];

    interface LoadEntry { date: string; load: number }
    const trainingLoads: LoadEntry[] = [];

    // Gym: load = duration × RPE
    for (const w of gymWorkouts) {
      if (w.rpe && w.duration_min) {
        trainingLoads.push({ date: w.date, load: w.duration_min * w.rpe });
      }
    }
    // BJJ: load = duration × estimated RPE 7 (BJJ is always hard)
    for (const b of bjjSessions) {
      const dur = b.metadata?.duracion || 90;
      trainingLoads.push({ date: b.date, load: dur * 7 });
    }

    // Sort by date, calculate weekly avg vs last 3 days
    trainingLoads.sort((a, b) => a.date.localeCompare(b.date));

    const threeDaysAgo = new Date(today + 'T12:00:00');
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysStr = threeDaysAgo.toISOString().slice(0, 10);

    const last3DaysLoad = trainingLoads.filter(l => l.date >= threeDaysStr).reduce((a, l) => a + l.load, 0);
    const weeklyAvgLoad = trainingLoads.length > 0
      ? trainingLoads.reduce((a, l) => a + l.load, 0) / Math.max(1, Math.ceil(trainingLoads.length / 3) * 3) * 3
      : 0;

    const loadSpike = weeklyAvgLoad > 0 && last3DaysLoad > weeklyAvgLoad * 1.3;
    const lastRpe = gymWorkouts.length > 0 ? gymWorkouts[0].rpe : null;

    if (loadSpike || (lastRpe !== null && lastRpe >= 9)) {
      const stepsCap = loadSpike ? Math.round(adjustedTargets.steps * 0.6) : 8000;
      adjustedTargets.steps = Math.min(adjustedTargets.steps, stepsCap);
      adjustedTargets.water = Math.max(adjustedTargets.water, adjustedTargets.water + 0.5);
      adjustedTargets.recovery_mode = true;
      adjustedTargets.training_load = { last3Days: last3DaysLoad, weeklyAvg: Math.round(weeklyAvgLoad), spike: loadSpike };

      if (loadSpike && !adjustedTargets.reason.includes('carga')) {
        adjustedTargets.reason += ` 🔴 Carga alta: ${last3DaysLoad} vs promedio ${Math.round(weeklyAvgLoad)} (+${Math.round((last3DaysLoad / weeklyAvgLoad - 1) * 100)}%). Bajamos pasos a ${adjustedTargets.steps} y subimos agua +500ml.`;
      } else if (lastRpe >= 9 && !adjustedTargets.reason.includes('RPE')) {
        adjustedTargets.reason += ` 🧘 RPE ${lastRpe} — bajamos pasos para recuperar.`;
      }
    }

    // ── Fatigue detection: energy <3 for 2+ consecutive days → recovery mode ──
    const energyHistory = (recentEnergy as {date:string;energy_level:number}[]) || [];
    const lowEnergyDays = energyHistory.filter(e => e.energy_level <= 2).length;
    const isFatigued = lowEnergyDays >= 2;

    if (isFatigued) {
      adjustedTargets.steps = Math.min(adjustedTargets.steps, 6000);
      adjustedTargets.water = Math.max(adjustedTargets.water, 3.0);
      adjustedTargets.recovery_mode = true;
      adjustedTargets.fatigue_detected = true;
      adjustedTargets.reason = `🧘 Día de Recuperación Activa. Energía baja ${lowEnergyDays} días seguidos — bajamos pasos a ${adjustedTargets.steps}, subimos agua a ${adjustedTargets.water}L. Prioridad: descansar bien.`;
    }

    // ── 3f. consumed_so_far + remaining_budget ──
    const consumedSoFar = {
      calories: todayFood.reduce((a, f) => a + (f.calories || 0), 0),
      protein: todayFood.reduce((a, f) => a + Number(f.protein || 0), 0),
      carbs: todayFood.reduce((a, f) => a + Number(f.carbs || 0), 0),
      fat: todayFood.reduce((a, f) => a + Number(f.fat || 0), 0),
      meals_logged: todayFood.length,
    };

    const remainingBudget = {
      calories: Math.max(0, adjustedTargets.calories - consumedSoFar.calories),
      protein: Math.max(0, adjustedTargets.protein - consumedSoFar.protein),
      carbs: Math.max(0, adjustedTargets.carbs - consumedSoFar.carbs),
      fat: Math.max(0, adjustedTargets.fat - consumedSoFar.fat),
    };

    // Week progress
    const weekTotalCal = weekConsumedCalories + consumedSoFar.calories;
    const weekExpected = baseCalories * (weekDaysElapsed + 1);
    const weekProgress = {
      consumed: weekTotalCal,
      expected: weekExpected,
      pct: weekExpected > 0 ? Math.round((weekTotalCal / weekExpected) * 100) : 0,
      daysElapsed: weekDaysElapsed + 1,
      status: adjustedTargets.status,
    };

    // ── 3c. Determine what to generate ──
    const existingVersion = (existingPlan?.plan_version as number) || 0;
    const isNewPlan = !existingPlan;
    // Always regenerate meals on recalculate (user just logged food, budget changed)
    const shouldGenerateMeals = isNewPlan || recalculate || timeOfDay === 'morning';

    // Logged meal types
    const loggedMealTypes = new Set(todayFood.map(f => f.meal_type));
    const missingMeals = ['desayuno', 'almuerzo', 'merienda', 'cena'].filter(m => !loggedMealTypes.has(m));

    // ── 3d. Meal suggestions (Claude) — 2 options per slot ──
    let mealSuggestions = existingPlan?.meal_suggestions || null;
    if (shouldGenerateMeals && missingMeals.length > 0) {
      const foodPrefs = foodInsights.map(i => i.insight_value?.pattern).filter(Boolean).join('\n');
      const userModelText = userModelData.length > 0 ? userModelData[0].model_content : '';
      const alreadyAte = todayFood.map(f => `${f.meal_type}: ${f.description} (${f.calories} kcal, ${f.protein}g prot)`).join('\n') || 'Nada todavía';

      const mealSlotMap: Record<string, string> = { desayuno: 'breakfast', almuerzo: 'lunch', merienda: 'snack', cena: 'dinner' };

      // Calculate active burn for meal context
      const gymDoneToday = (todayHabits as {habit_type:string;value:number}[]).some(h => h.habit_type === 'gym' && Number(h.value) >= 1);
      const bjjDoneToday = (todayHabits as {habit_type:string;value:number}[]).some(h => h.habit_type === 'bjj' && Number(h.value) >= 1);
      const stepsToday = Number(((todayHabits as {habit_type:string;value:number}[]).find(h => h.habit_type === 'steps')?.value) || 0);
      // Rough burn estimate (server-side, matches client activeBurn.js logic)
      let activeBurnToday = Math.round(stepsToday / 1300 / 5 * (85 * 3.5 - 85)); // steps
      if (gymDoneToday) activeBurnToday += 300;
      if (bjjDoneToday) activeBurnToday += 600;
      const highBurn = activeBurnToday > 600;

      const mealsPrompt = `Target del día: ${adjustedTargets.calories} kcal, ${adjustedTargets.protein}g prot
Ya consumió: ${consumedSoFar.calories} kcal, ${consumedSoFar.protein}g prot (${consumedSoFar.meals_logged} comidas)
PRESUPUESTO RESTANTE: ${remainingBudget.calories} kcal, ${remainingBudget.protein}g prot
Día: ${dayName}
GASTO ACTIVO HOY: ${activeBurnToday} kcal ${highBurn ? '(ALTO — entrenó fuerte)' : ''}

Ya comió hoy:
${alreadyAte}

Comidas que faltan: ${missingMeals.join(', ')}

IMPORTANTE: Las calorías de TODAS las sugerencias restantes deben sumar aproximadamente ${remainingBudget.calories} kcal.
${highBurn ? 'GASTO ACTIVO ALTO (>' + activeBurnToday + ' kcal): Las sugerencias de CENA deben incluir más CARBOHIDRATOS COMPLEJOS (arroz, papa, fideos) para reponer glucógeno y evitar catabolismo. En el campo description incluir: "Para recuperar lo que quemaste hoy".' : ''}
${consumedSoFar.calories > adjustedTargets.calories * 0.5 ? 'COMIÓ BASTANTE — sugerí opciones livianas para las comidas restantes.' : ''}
${consumedSoFar.protein < adjustedTargets.protein * 0.3 ? 'PROTEÍNA MUY BAJA — priorizá opciones altas en proteína.' : ''}

${foodPrefs ? 'PREFERENCIAS ALIMENTARIAS:\n' + foodPrefs : ''}

Dá 2 OPCIONES por cada comida que falta (opción A y opción B). Una más sustanciosa y una más liviana.

Respondé SOLO con JSON. Formato:
{
  "lunch"?: { "options": [{ "name": "...", "description": "...", "estimated_calories": N, "estimated_protein": N }, { "name": "...", "description": "...", "estimated_calories": N, "estimated_protein": N }] },
  "snack"?: { "options": [...] },
  "dinner"?: { "options": [...] }
}
Usá los keys en inglés: breakfast, lunch, snack, dinner. Solo las comidas que faltan.`;

      try {
        const raw = await callClaude(
          "Sos el planificador de comidas de Mati. Conocés sus preferencias reales. Sugerí comidas que realmente come (comida argentina, porciones reales). NO sugieras quinoa, açaí, tofu. Sé específico con porciones. Las opciones deben sumar el presupuesto restante. Respondé SOLO JSON.",
          mealsPrompt,
          { maxTokens: 800, temperature: 0.6 }
        );
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        mealSuggestions = JSON.parse(cleaned);
      } catch {
        mealSuggestions = existingPlan?.meal_suggestions || null;
      }
    }

    // ── 3e. Narrative (Claude) ──
    let morningBrief = (existingPlan?.morning_brief as string) || null;
    let middayAdjust = (existingPlan?.midday_adjust as string) || null;
    let eveningWrap = (existingPlan?.evening_wrap as string) || null;

    const habitsStatus = todayHabits.map(h => `${h.habit_type}: ${h.value}/${h.target} (${h.completion_type})`).join(', ') || 'Sin hábitos todavía';
    const energyLevel = todayEnergy.length > 0 ? todayEnergy[0].energy_level : null;

    if (timeOfDay === 'morning' && (isNewPlan || !morningBrief)) {
      morningBrief = await callClaude(
        "Sos Brim, coach de Mati. Tono directo, argentino, 3-4 oraciones.",
        `Escribí un brief para arrancar el día.
Semana: ${weekProgress.pct}% del budget calórico (${weekProgress.status})
Target hoy: ${adjustedTargets.calories} kcal — ${adjustedTargets.reason}
Agua hoy: ${adjustedTargets.water}L ${hadAlcoholYesterday ? '(+1L por alcohol de ayer — DÍA DE LIMPIEZA)' : ''}
Energía: ${energyLevel ? energyLevel + '/5' : 'sin registrar'}
Día: ${dayName}
Hábitos: ${habitsStatus}
${hadAlcoholYesterday ? 'IMPORTANTE: Ayer tomó alcohol. Enfocá el brief en recuperación: agua, comida liviana, descanso. Mencioná que si tiene que rodar/entrenar necesita tomar mucha agua.' : ''}
${isFatigued ? 'IMPORTANTE: Energía baja ≤2 por ' + lowEnergyDays + ' días seguidos. Hoy es DÍA DE RECUPERACIÓN ACTIVA. NO empujar al gym. El brief debe decir: "Hoy es día de recuperación. Bajamos calorías, subimos agua y prioridad: 8hs de sueño. Mañana volvemos con todo." El bienestar es consistencia, no intensidad infinita.' : ''}
${loadSpike ? 'IMPORTANTE: Carga de entrenamiento alta — los últimos 3 días fueron ' + Math.round((last3DaysLoad / weeklyAvgLoad - 1) * 100) + '% más que el promedio. El cuerpo necesita reconstruir. Mencioná: "Los datos dicen que le diste duro. Hoy bajamos la intensidad para volver más fuerte mañana."' : ''}`,
        { maxTokens: 200, temperature: 0.7 }
      );
    } else if (timeOfDay === 'midday' && recalculate) {
      middayAdjust = await callClaude(
        "Sos Brim, coach de Mati. Tono directo, argentino, 2-3 oraciones.",
        `Recálculo post-almuerzo.
Consumido hoy: ${consumedSoFar.calories} kcal, ${consumedSoFar.protein}g prot (${consumedSoFar.meals_logged} comidas)
Presupuesto restante: ${remainingBudget.calories} kcal, ${remainingBudget.protein}g prot
Proteína ${consumedSoFar.protein < adjustedTargets.protein * 0.5 ? 'viene BAJA' : 'viene bien'}
Semana: ${weekProgress.pct}% del budget`,
        { maxTokens: 150, temperature: 0.7 }
      );
    } else if (timeOfDay === 'evening') {
      eveningWrap = await callClaude(
        "Sos Brim, coach de Mati. Tono directo, argentino, 2-3 oraciones. Celebratorio si fue buen día, constructivo si no.",
        `Cierre del día.
Consumido: ${consumedSoFar.calories}/${adjustedTargets.calories} kcal, ${consumedSoFar.protein}/${adjustedTargets.protein}g prot
Hábitos: ${habitsStatus}
Energía: ${energyLevel ? energyLevel + '/5' : 'sin registrar'}
Semana: ${weekProgress.pct}% del budget (${weekProgress.status})`,
        { maxTokens: 150, temperature: 0.7 }
      );
    }

    // ── 3g. Upsert daily_plans ──
    const planRow = {
      user_id: MATI_ID,
      date: today,
      plan_version: existingVersion + 1,
      adjusted_targets: adjustedTargets,
      meal_suggestions: mealSuggestions,
      consumed_so_far: consumedSoFar,
      remaining_budget: remainingBudget,
      week_progress: weekProgress,
      morning_brief: morningBrief,
      midday_adjust: middayAdjust,
      evening_wrap: eveningWrap,
      generated_at: new Date().toISOString(),
    };

    const saved = await upsertRow("daily_plans", planRow);

    // ── 3h. Response ──
    return new Response(
      JSON.stringify({ ...planRow, id: saved?.id || 'new', time_of_day: timeOfDay }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("daily-plan error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

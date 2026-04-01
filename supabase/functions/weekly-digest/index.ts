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

function getLastMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 7 : day;
  d.setDate(d.getDate() - diff - 6); // last Monday
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const weekStart = body.week_start || getLastMonday();
    const ws = new Date(weekStart + "T12:00:00");
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const weekEnd = we.toISOString().slice(0, 10);

    // Check if digest already exists
    const existing = await query("weekly_digests",
      `select=*&user_id=eq.${MATI_ID}&week_start=eq.${weekStart}&limit=1`
    ) as Record<string, unknown>[];

    if (existing.length > 0) {
      return new Response(
        JSON.stringify(existing[0]),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all data for the week
    const enc = encodeURIComponent;
    const [habits, food, weight, points, energy, cycles] = await Promise.all([
      query("habit_logs", `select=date,habit_type,value,target,completion_type&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(weekStart)}&date=lte.${enc(weekEnd)}&order=date.asc`),
      query("food_logs", `select=logged_at,calories,protein,carbs,fat&user_id=eq.${enc(MATI_ID)}&logged_at=gte.${enc(weekStart + "T00:00:00-03:00")}&logged_at=lte.${enc(weekEnd + "T23:59:59-03:00")}`),
      query("weight_logs", `select=date,weight&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(weekStart)}&date=lte.${enc(weekEnd)}&order=date.asc`),
      query("points_log", `select=points,date&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(weekStart)}&date=lte.${enc(weekEnd)}`),
      query("daily_logs", `select=date,energy_level&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(weekStart)}&date=lte.${enc(weekEnd)}`),
      query("cycles", `select=*&user_id=eq.${enc(MATI_ID)}&status=eq.active&limit=1`),
    ]) as [
      {date:string;habit_type:string;value:number;target:number;completion_type:string}[],
      {logged_at:string;calories:number;protein:number;carbs:number;fat:number}[],
      {date:string;weight:number}[],
      {points:number;date:string}[],
      {date:string;energy_level:number}[],
      Record<string, unknown>[],
    ];

    // Calculate KPIs
    const habitTypes = ["water", "steps", "bjj", "gym"];
    const habitsSummary: Record<string, {full:number;partial:number;total:number;pct:number}> = {};
    const activeDays = new Set<string>();

    habitTypes.forEach(type => {
      const logs = habits.filter(h => h.habit_type === type);
      const full = logs.filter(h => h.completion_type === "full").length;
      const partial = logs.filter(h => h.completion_type === "partial").length;
      const total = logs.length;
      habitsSummary[type] = { full, partial, total, pct: total > 0 ? Math.round(full / 7 * 100) : 0 };
      logs.forEach(h => activeDays.add(h.date));
    });

    // Food averages
    const foodByDay: Record<string, {cal:number;prot:number}> = {};
    food.forEach(f => {
      const day = f.logged_at.slice(0, 10);
      if (!foodByDay[day]) foodByDay[day] = { cal: 0, prot: 0 };
      foodByDay[day].cal += f.calories || 0;
      foodByDay[day].prot += Number(f.protein || 0);
    });
    const foodDays = Object.values(foodByDay);
    const avgCal = foodDays.length > 0 ? Math.round(foodDays.reduce((a, d) => a + d.cal, 0) / foodDays.length) : 0;
    const avgProt = foodDays.length > 0 ? Math.round(foodDays.reduce((a, d) => a + d.prot, 0) / foodDays.length) : 0;

    // Weight
    const weightDelta = weight.length >= 2
      ? Number((weight[weight.length - 1].weight - weight[0].weight).toFixed(1))
      : null;

    // Points
    const totalPoints = points.reduce((a, p) => a + p.points, 0);

    // Energy avg
    const energyAvg = energy.length > 0
      ? Math.round(energy.reduce((a, e) => a + e.energy_level, 0) / energy.length * 10) / 10
      : null;

    const insights = {
      activeDays: activeDays.size,
      habitsSummary,
      avgCalories: avgCal,
      avgProtein: avgProt,
      weightDelta,
      totalPoints,
      energyAvg,
      cycleName: cycles.length > 0 ? cycles[0].name : null,
      foodDaysLogged: foodDays.length,
    };

    // Generate digest with Claude
    const prompt = `Generá un resumen semanal de bienestar basado en estos datos.

SEMANA: ${weekStart} al ${weekEnd}

DATOS:
- Días activos: ${activeDays.size} de 7
- Agua: ${habitsSummary.water?.full || 0}/7 días completos (${habitsSummary.water?.pct || 0}%)
- Pasos: ${habitsSummary.steps?.full || 0}/7 días completos (${habitsSummary.steps?.pct || 0}%)
- BJJ: ${habitsSummary.bjj?.full || 0} sesiones
- Gym: ${habitsSummary.gym?.full || 0} sesiones
- Comida loggeada: ${foodDays.length} días, promedio ${avgCal} kcal/día, ${avgProt}g prot/día
- Peso: ${weightDelta !== null ? (weightDelta > 0 ? '+' : '') + weightDelta + 'kg' : 'sin datos'}
- Puntos ganados: ${totalPoints}
- Energía promedio: ${energyAvg !== null ? energyAvg + '/5' : 'sin datos'}
${cycles.length > 0 ? '- Ciclo activo: ' + cycles[0].name : ''}

FORMATO:
1. Score general de la semana (emoji + una oración)
2. Top 2-3 wins (lo que salió bien)
3. Top 1-2 áreas a mejorar
4. 1 recomendación concreta para esta semana

Máximo 200 palabras. Tono: directo, argentino, como un coach que te conoce. No seas condescendiente. Usá markdown para negritas y listas.`;

    const digestContent = await callClaude(
      "Sos Brim, coach de bienestar de Mati. Generás resúmenes semanales concisos y accionables.",
      prompt,
      { maxTokens: 400, temperature: 0.6 }
    );

    // Save to DB
    const digestRow = {
      user_id: MATI_ID,
      week_start: weekStart,
      week_end: weekEnd,
      digest_content: digestContent,
      habits_summary: habitsSummary,
      insights,
    };

    await fetch(`${SB_URL}/rest/v1/weekly_digests`, {
      method: "POST",
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(digestRow),
    });

    return new Response(
      JSON.stringify({ ...digestRow, id: "new" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

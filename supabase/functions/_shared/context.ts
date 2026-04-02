const SB_URL = "https://birpqzahbtfbxxtaqeth.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5MTE4MywiZXhwIjoyMDkwMDY3MTgzfQ.k8tjbC_fcUv34cPwo2Vcewu3eUe7GDjyOy3B9f9Jtnk";

// Direct REST API calls instead of Supabase JS SDK (avoids auth resolution bug in Deno)
async function query(table: string, params: string): Promise<unknown[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/${table}?${params}`,
    {
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) return [];
  return await res.json();
}

async function querySingle(table: string, params: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${SB_URL}/rest/v1/${table}?${params}`,
    {
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.pgrst.object+json",
      },
    }
  );
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

interface UserContext {
  today: string;
  habits: {
    last7days: Record<string, { date: string; type: string; value: number; target: number; completion: string }[]>;
    completionPct: Record<string, number>;
    streak: number;
  };
  food: {
    last7days: Record<string, { calories: number; protein: number; carbs: number; fat: number }>;
    avgCalories: number;
    avgProtein: number;
  };
  weight: {
    recent: { date: string; weight: number }[];
    delta: number | null;
    current: number | null;
  };
  energy: {
    last7days: Record<string, number>;
    avg: number | null;
  };
  points: {
    total: number;
    streak: number;
  };
  cycle: {
    name: string | null;
    week: number | null;
    targets: Record<string, number>;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    steps: number;
  };
}

export async function buildUserContext(userId: string): Promise<UserContext> {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString().slice(0, 10);

  // Parallel REST queries
  const enc = encodeURIComponent;
  const [habitLogs, foodLogs, weightData, energyLogs, pointsData, cyclesData, profile] =
    await Promise.all([
      query("habit_logs", `select=date,habit_type,value,target,completion_type&user_id=eq.${enc(userId)}&date=gte.${enc(since)}&order=date.desc`) as Promise<{date:string;habit_type:string;value:number;target:number;completion_type:string}[]>,
      query("food_logs", `select=logged_at,calories,protein,carbs,fat&user_id=eq.${enc(userId)}&logged_at=gte.${enc(since + "T00:00:00-03:00")}&order=logged_at.desc`) as Promise<{logged_at:string;calories:number;protein:number;carbs:number;fat:number}[]>,
      query("weight_logs", `select=date,weight&user_id=eq.${enc(userId)}&order=date.desc&limit=5`) as Promise<{date:string;weight:number}[]>,
      query("daily_logs", `select=date,energy_level&user_id=eq.${enc(userId)}&date=gte.${enc(since)}&order=date.desc`) as Promise<{date:string;energy_level:number}[]>,
      query("points_log", `select=points&user_id=eq.${enc(userId)}`) as Promise<{points:number}[]>,
      query("cycles", `select=*&user_id=eq.${enc(userId)}&status=eq.active&order=created_at.desc&limit=1`) as Promise<Record<string,unknown>[]>,
      querySingle("user_profile", `select=daily_calorie_target,daily_protein_target,daily_carbs_target,daily_fat_target,daily_water_target,daily_steps_target&id=eq.${enc(userId)}`),
    ]);

  // Load cycle_targets if active cycle exists
  const cycle = cyclesData.length > 0 ? cyclesData[0] : null;
  let cycleTargetsData: {habit_type:string;weekly_target:number}[] = [];
  if (cycle) {
    cycleTargetsData = await query("cycle_targets", `select=habit_type,weekly_target&cycle_id=eq.${enc(cycle.id as string)}`) as {habit_type:string;weekly_target:number}[];
  }

  // Process habits
  const habitsByDate: Record<string, typeof habitLogs> = {};
  const habitCounts: Record<string, { done: number; total: number }> = {};

  for (const h of habitLogs) {
    if (!habitsByDate[h.date]) habitsByDate[h.date] = [];
    habitsByDate[h.date].push(h);

    if (!habitCounts[h.habit_type]) habitCounts[h.habit_type] = { done: 0, total: 0 };
    habitCounts[h.habit_type].total++;
    if (h.completion_type === "full") habitCounts[h.habit_type].done++;
  }

  const completionPct: Record<string, number> = {};
  for (const [type, counts] of Object.entries(habitCounts)) {
    completionPct[type] = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
  }

  // Streak (consecutive days with at least 1 full habit)
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const key = d.toISOString().slice(0, 10);
    const dayLogs = habitsByDate[key];
    const hasFull = dayLogs?.some((l) => l.completion_type === "full");
    if (hasFull) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }

  // Process food by day
  const foodByDay: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
  for (const f of foodLogs) {
    const day = f.logged_at.slice(0, 10);
    if (!foodByDay[day]) foodByDay[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    foodByDay[day].calories += f.calories ?? 0;
    foodByDay[day].protein += Number(f.protein ?? 0);
    foodByDay[day].carbs += Number(f.carbs ?? 0);
    foodByDay[day].fat += Number(f.fat ?? 0);
  }

  const foodDays = Object.values(foodByDay);
  const avgCalories = foodDays.length > 0 ? Math.round(foodDays.reduce((a, d) => a + d.calories, 0) / foodDays.length) : 0;
  const avgProtein = foodDays.length > 0 ? Math.round(foodDays.reduce((a, d) => a + d.protein, 0) / foodDays.length) : 0;

  // Weight
  const weights = (weightData ?? []).reverse();
  const weightDelta = weights.length >= 2
    ? Number((weights[weights.length - 1].weight - weights[0].weight).toFixed(1))
    : null;

  // Energy
  const energyByDay: Record<string, number> = {};
  for (const e of energyLogs) {
    energyByDay[e.date] = e.energy_level;
  }
  const energyValues = Object.values(energyByDay);
  const energyAvg = energyValues.length > 0 ? Math.round((energyValues.reduce((a, v) => a + v, 0) / energyValues.length) * 10) / 10 : null;

  // Points
  const totalPoints = (pointsData ?? []).reduce((a: number, r: { points: number }) => a + r.points, 0);

  // Cycle
  let cycleWeek: number | null = null;
  const cycleTargets: Record<string, number> = {};
  if (cycle) {
    const started = new Date((cycle.started_at as string) + "T12:00:00");
    const diffDays = Math.floor((Date.now() - started.getTime()) / (1000 * 60 * 60 * 24));
    cycleWeek = Math.min(Math.floor(diffDays / 7) + 1, 4);
    for (const t of cycleTargetsData) {
      cycleTargets[t.habit_type] = t.weekly_target;
    }
  }

  // Profile targets
  const targets = {
    calories: profile?.daily_calorie_target ?? 2100,
    protein: profile?.daily_protein_target ?? 150,
    carbs: profile?.daily_carbs_target ?? 210,
    fat: profile?.daily_fat_target ?? 70,
    water: Number(profile?.daily_water_target) || 2.5,
    steps: profile?.daily_steps_target ?? 10000,
  };

  // Fetch user_model and active insights
  const [userModelData, insightsData] = await Promise.all([
    query("user_model", `select=model_content,model_version,generated_at&user_id=eq.${enc(userId)}&order=generated_at.desc&limit=1`) as Promise<{model_content:string;model_version:number;generated_at:string}[]>,
    query("user_insights", `select=insight_type,insight_key,insight_value,confidence&user_id=eq.${enc(userId)}&active=eq.true&order=confidence.desc&limit=10`) as Promise<{insight_type:string;insight_key:string;insight_value:Record<string,string>;confidence:number}[]>,
  ]);

  const userModel = userModelData.length > 0 ? userModelData[0] : null;
  const activeInsights = insightsData.map(i => ({
    type: i.insight_type,
    key: i.insight_key,
    pattern: i.insight_value?.pattern ?? '',
    suggestion: i.insight_value?.suggestion ?? '',
    confidence: i.confidence,
  }));

  return {
    today,
    habits: { last7days: habitsByDate, completionPct, streak },
    food: { last7days: foodByDay, avgCalories, avgProtein },
    weight: {
      recent: weights.map((w) => ({ date: w.date, weight: Number(w.weight) })),
      delta: weightDelta,
      current: weights.length > 0 ? Number(weights[weights.length - 1].weight) : null,
    },
    energy: { last7days: energyByDay, avg: energyAvg },
    points: { total: totalPoints, streak },
    cycle: { name: (cycle?.name as string) ?? null, week: cycleWeek, targets: cycleTargets },
    targets,
    userModel: userModel ? { content: userModel.model_content, version: userModel.model_version, generatedAt: userModel.generated_at } : null,
    activeInsights,
  };
}

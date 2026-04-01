import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

  // Parallel queries
  const [habitsRes, foodRes, weightRes, energyRes, pointsRes, cycleRes, profileRes] =
    await Promise.all([
      supabase
        .from("habit_logs")
        .select("date, habit_type, value, target, completion_type")
        .eq("user_id", userId)
        .gte("date", since)
        .order("date", { ascending: false }),

      supabase
        .from("food_logs")
        .select("logged_at, calories, protein, carbs, fat")
        .eq("user_id", userId)
        .gte("logged_at", since + "T00:00:00-03:00")
        .order("logged_at", { ascending: false }),

      supabase
        .from("weight_logs")
        .select("date, weight")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(5),

      supabase
        .from("daily_logs")
        .select("date, energy_level")
        .eq("user_id", userId)
        .gte("date", since)
        .order("date", { ascending: false }),

      supabase
        .from("points_log")
        .select("points")
        .eq("user_id", userId),

      supabase
        .from("cycles")
        .select("*, cycle_targets:cycle_targets(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .single(),

      supabase
        .from("user_profile")
        .select("daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_water_target, daily_steps_target")
        .eq("id", userId)
        .single(),
    ]);

  // Process habits
  const habitLogs = habitsRes.data ?? [];
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
  const foodLogs = foodRes.data ?? [];
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
  const weights = (weightRes.data ?? []).reverse();
  const weightDelta = weights.length >= 2
    ? Number((weights[weights.length - 1].weight - weights[0].weight).toFixed(1))
    : null;

  // Energy
  const energyLogs = energyRes.data ?? [];
  const energyByDay: Record<string, number> = {};
  for (const e of energyLogs) {
    energyByDay[e.date] = e.energy_level;
  }
  const energyValues = Object.values(energyByDay);
  const energyAvg = energyValues.length > 0 ? Math.round((energyValues.reduce((a, v) => a + v, 0) / energyValues.length) * 10) / 10 : null;

  // Points
  const totalPoints = (pointsRes.data ?? []).reduce((a: number, r: { points: number }) => a + r.points, 0);

  // Cycle
  const cycle = cycleRes.data;
  let cycleWeek: number | null = null;
  const cycleTargets: Record<string, number> = {};
  if (cycle) {
    const started = new Date(cycle.started_at + "T12:00:00");
    const diffDays = Math.floor((Date.now() - started.getTime()) / (1000 * 60 * 60 * 24));
    cycleWeek = Math.min(Math.floor(diffDays / 7) + 1, 4);
    for (const t of (cycle.cycle_targets ?? [])) {
      cycleTargets[t.habit_type] = t.weekly_target;
    }
  }

  // Profile targets
  const profile = profileRes.data;
  const targets = {
    calories: profile?.daily_calorie_target ?? 2100,
    protein: profile?.daily_protein_target ?? 150,
    carbs: profile?.daily_carbs_target ?? 210,
    fat: profile?.daily_fat_target ?? 70,
    water: Number(profile?.daily_water_target) || 2.5,
    steps: profile?.daily_steps_target ?? 10000,
  };

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
    cycle: { name: cycle?.name ?? null, week: cycleWeek, targets: cycleTargets },
    targets,
  };
}

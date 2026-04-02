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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const remaining = body.remaining_macros || { kcal: 500, protein: 30, carbs: 50, fat: 20 };
    const timeOfDay = body.time_of_day || (() => {
      const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })).getHours();
      return h < 12 ? 'mañana' : h < 16 ? 'mediodía' : h < 20 ? 'merienda' : 'noche';
    })();
    const context = body.context || ''; // post-gym, post-bjj, recovery, etc.
    const enc = encodeURIComponent;

    // Fetch user preferences
    const [userModel, foodInsights, topFoods] = await Promise.all([
      query("user_model", `select=model_content&user_id=eq.${enc(MATI_ID)}&order=generated_at.desc&limit=1`) as Promise<{model_content:string}[]>,
      query("user_insights", `select=insight_value&user_id=eq.${enc(MATI_ID)}&insight_type=eq.food_preference&active=eq.true&order=confidence.desc&limit=5`) as Promise<{insight_value:Record<string,string>}[]>,
      query("food_logs", `select=description,calories,protein&user_id=eq.${enc(MATI_ID)}&order=logged_at.desc&limit=50`) as Promise<{description:string;calories:number;protein:number}[]>,
    ]);

    // Extract real food preferences from history
    const foodFreq: Record<string, number> = {};
    for (const f of topFoods) {
      const key = (f.description || '').toLowerCase().trim();
      if (key) foodFreq[key] = (foodFreq[key] || 0) + 1;
    }
    const favFoods = Object.entries(foodFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => `${name} (${count}x)`)
      .join(', ');

    const insightPrefs = foodInsights.map(i => i.insight_value?.pattern).filter(Boolean).join('\n');
    const modelSection = userModel.length > 0
      ? (userModel[0].model_content.split('**Alimentación**')[1]?.split('**')[0] || '').trim()
      : '';

    // ── HARD LIMITS: cap per-meal calories by time of day ──
    const mealCaps: Record<string, number> = {
      'mañana': 600,    // desayuno max
      'mediodía': 800,  // almuerzo max
      'merienda': 400,  // merienda max
      'noche': 700,     // cena max
    };
    const maxKcal = mealCaps[timeOfDay] || 800;
    // If remaining > maxKcal, cap it and add overflow note
    const cappedKcal = Math.min(remaining.kcal, maxKcal);
    const hasOverflow = remaining.kcal > maxKcal;
    const overflowKcal = remaining.kcal - cappedKcal;

    const prompt = `Mati necesita una comida ÚNICA para ${timeOfDay}.

TARGET PARA ESTA COMIDA (LÍMITE ESTRICTO):
- Calorías: ${cappedKcal} kcal (MÁXIMO ABSOLUTO: ${maxKcal} kcal — NO PASAR)
- Proteína: ${Math.min(remaining.protein, 50)}g (proporcional)
- Carbos: ${remaining.carbs ? Math.round(remaining.carbs * cappedKcal / Math.max(remaining.kcal, 1)) : 'flexible'}g
- Grasa: ${remaining.fat ? Math.round(remaining.fat * cappedKcal / Math.max(remaining.kcal, 1)) : 'flexible'}g
${hasOverflow ? `\nNOTA: Le quedan ${remaining.kcal} kcal en el día pero esta comida es de ${cappedKcal} max. En "brim_says" mencioná: "Te sobran muchas calorías, vamos con esta comida potente pero repartí las ${overflowKcal} kcal restantes en snacks o la próxima comida."` : ''}

MOMENTO: ${timeOfDay}
${context ? 'CONTEXTO: ' + context : ''}

COMIDAS FRECUENTES DE MATI:
${favFoods || 'Sin datos suficientes'}

${insightPrefs ? 'PREFERENCIAS DETECTADAS:\n' + insightPrefs : ''}
${modelSection ? 'PERFIL ALIMENTARIO:\n' + modelSection : ''}

⚠️ REGLAS CRÍTICAS DE PORCIONES (HARD LIMITS):
- MÁXIMO ABSOLUTO por comida: ${maxKcal} kcal. NUNCA sugerir más de esto.
- Desayuno: 400-600 kcal máximo
- Almuerzo: 600-800 kcal máximo
- Merienda: 200-400 kcal máximo
- Cena: 500-700 kcal máximo
- Si los ingredientes no suman las kcal declaradas, AJUSTÁ los ingredientes. No inventes números.
- VALIDACIÓN: Verificá mentalmente que las porciones sean realistas:
  - 200g pollo ≈ 220 kcal, 100g arroz cocido ≈ 130 kcal, 1 huevo ≈ 75 kcal
  - 1 milanesa ≈ 350 kcal, 1 tostada con queso ≈ 180 kcal

OTRAS REGLAS:
- Usá ingredientes que Mati ya come o comunes en Argentina
- NO sugieras: quinoa, açaí, tofu, kale, smoothie bowls
- SÍ sugerí: pollo, carne, huevo, arroz, fideos, verduras, queso, pan, yogur
- Si es NOCHE: que sea liviana, fácil de digerir
- Si es POST-GYM/BJJ con gasto alto (>600kcal): SUBIR carbohidratos complejos para reponer glucógeno. Why: "Como hoy quemaste mucho, le subimos a los carbs"
- Si es POST-GYM/BJJ con gasto normal: priorizá proteína
- Si es MERIENDA: algo rápido y práctico
- Nombre creativo argentino (nada de "Bowl de..." o "Smoothie de...")
- Instrucciones breves (3-5 pasos, tipo receta de WhatsApp)

RESPONDÉ SOLO CON JSON:
{
  "meal_name": "Nombre creativo argentino",
  "brim_says": "Frase de Brim presentando el plato (1-2 oraciones, tono coach argentino)",
  "ingredients": ["200g pechuga de pollo", "1 taza arroz", "..."],
  "instructions": "1. Hacé X. 2. Agregá Y. 3. Serví.",
  "why": "Explicación breve de por qué esta comida le sirve hoy",
  "macros": { "kcal": N, "protein": N, "carbs": N, "fat": N },
  "meal_type": "cena"
}`;

    const raw = await callClaude(
      "Sos el Chef Bio-Analítico de Brim Hub. Creás comidas personalizadas que encajan perfecto en los macros restantes del usuario. Hablás como un coach argentino que sabe de cocina y nutrición. Respondé SOLO JSON.",
      prompt,
      { maxTokens: 600, temperature: 0.7 }
    );

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    // ── Server-side validation: clamp if Claude ignored the cap ──
    if (result.macros && result.macros.kcal > maxKcal + 50) {
      const ratio = maxKcal / result.macros.kcal;
      result.macros.kcal = maxKcal;
      result.macros.protein = Math.round((result.macros.protein || 0) * ratio);
      result.macros.carbs = Math.round((result.macros.carbs || 0) * ratio);
      result.macros.fat = Math.round((result.macros.fat || 0) * ratio);
      result.brim_says = (result.brim_says || '') + ' (Ajustado a ' + maxKcal + ' kcal para no pasarte)';
    }

    // Add overflow info if applicable
    if (hasOverflow) {
      result.overflow_note = `Te sobran ${overflowKcal} kcal más para repartir en snacks o la próxima comida.`;
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    const timeMinutes = body.time || 60;
    const focus = body.focus || 'fuerza'; // fuerza | bjj | estetica
    const enc = encodeURIComponent;

    // Fetch PRs
    const prs = await query("gym_prs", `select=exercise,weight,reps,date&user_id=eq.${enc(MATI_ID)}&order=date.desc&limit=100`) as {exercise:string;weight:number;reps:number;date:string}[];

    // Get max PR per exercise
    const maxPRs: Record<string, { weight: number; reps: number; date: string }> = {};
    for (const pr of prs) {
      if (!maxPRs[pr.exercise] || Number(pr.weight) > Number(maxPRs[pr.exercise].weight)) {
        maxPRs[pr.exercise] = { weight: Number(pr.weight), reps: pr.reps, date: pr.date };
      }
    }

    // Fetch user model for context
    const userModel = await query("user_model", `select=model_content&user_id=eq.${enc(MATI_ID)}&order=generated_at.desc&limit=1`) as {model_content:string}[];

    const prsText = Object.entries(maxPRs).map(([ex, pr]) => `- ${ex}: ${pr.weight}kg × ${pr.reps} (${pr.date})`).join('\n') || 'Sin PRs registrados';

    const prompt = `Diseñá una rutina de entrenamiento para Mati.

PARÁMETROS:
- Tiempo disponible: ${timeMinutes} minutos
- Foco: ${focus}
- Día: ${new Date().toLocaleDateString('es-AR', { weekday: 'long' })}

PRs HISTÓRICOS:
${prsText}

${userModel.length > 0 ? '\nPERFIL:\n' + userModel[0].model_content : ''}

REGLAS DE ORO:
1. SIEMPRE arrancar con un Main Lift pesado:
   - Si hay PRs de Sentadilla/Peso muerto/Press: usá el 80-85% del PR como peso de trabajo
   - Si no hay PRs: estimá pesos conservadores para un hombre de ~85kg
   - Esquema: 4-5 sets de 3-5 reps para fuerza, 3-4 sets de 8-12 para estética

2. Accesorios OBLIGATORIOS para complementar BJJ:
   - Al menos 1 ejercicio de TRACCIÓN (remo, dominadas, face pulls) — BJJ requiere mucho tirón
   - Al menos 1 ejercicio de CORE (planchas, pallof press, Ab wheel) — base del grappling
   - Al menos 1 de ESTABILIDAD DE HOMBROS (face pulls, band pull-aparts, Y-T-W) — prevención de lesiones

3. Si foco = BJJ:
   - Priorizá grip (farmer carry, dead hangs), neck (shrugs), hip mobility
   - Menos volumen, más explosividad (menos reps, más velocidad)

4. Si foco = Estética:
   - Más volumen en accesorios (3-4 sets de 10-15)
   - Incluir curl bíceps, press inclinado, laterales

5. TIMING: Calculá exactamente para que entre en ${timeMinutes} min:
   - Main lift: ~${Math.round(timeMinutes * 0.35)} min (incluye calentamiento progresivo)
   - Accesorios: ~${Math.round(timeMinutes * 0.5)} min
   - Core/finalizer: ~${Math.round(timeMinutes * 0.15)} min
   - Descansos: 2-3 min entre sets pesados, 60-90s en accesorios

6. Respondé SOLO con JSON válido:
{
  "routine_name": "Nombre descriptivo corto",
  "focus": "${focus}",
  "estimated_time": ${timeMinutes},
  "exercises": [
    {
      "name": "Sentadilla",
      "category": "main_lift",
      "sets": 4,
      "target_reps": 5,
      "target_weight": 80,
      "rest_seconds": 180,
      "notes": "Calentá con 40-60-70 antes"
    }
  ],
  "coach_note": "Frase corta motivacional de coach argentino"
}`;

    const raw = await callClaude(
      "Sos el Head Coach de Brim Hub. Diseñás rutinas de gym personalizadas para un pibe argentino que entrena BJJ y quiere estar fuerte sin lesionarse. Conocés sus PRs y su historial. Respondé SOLO JSON.",
      prompt,
      { maxTokens: 1200, temperature: 0.5 }
    );

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const routine = JSON.parse(cleaned);

    return new Response(
      JSON.stringify(routine),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

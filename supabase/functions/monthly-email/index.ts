import { callClaude } from "../_shared/anthropic.ts";

const MATI_ID = "c17e4105-4861-43c8-bf13-0d32f7818418";
const MATI_EMAIL = "matias@rufusocial.com";
const SB_URL = "https://birpqzahbtfbxxtaqeth.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5MTE4MywiZXhwIjoyMDkwMDY3MTgzfQ.k8tjbC_fcUv34cPwo2Vcewu3eUe7GDjyOy3B9f9Jtnk";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

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
    // Last month
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const start = `${year}-${String(lastMonth).padStart(2, '0')}-01`;
    const endDay = new Date(year, lastMonth, 0).getDate();
    const end = `${year}-${String(lastMonth).padStart(2, '0')}-${endDay}`;
    const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const enc = encodeURIComponent;

    // Fetch data
    const [food, weights, habits] = await Promise.all([
      query("food_logs", `select=logged_at,description,calories,protein&user_id=eq.${enc(MATI_ID)}&logged_at=gte.${enc(start + "T00:00:00-03:00")}&logged_at=lte.${enc(end + "T23:59:59-03:00")}`) as Promise<{logged_at:string;description:string;calories:number;protein:number}[]>,
      query("weight_logs", `select=date,weight&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(start)}&date=lte.${enc(end)}&order=date.asc`) as Promise<{date:string;weight:number}[]>,
      query("habit_logs", `select=date,habit_type,completion_type&user_id=eq.${enc(MATI_ID)}&date=gte.${enc(start)}&date=lte.${enc(end)}`) as Promise<{date:string;habit_type:string;completion_type:string}[]>,
    ]);

    // Stats
    const foodDays = new Set(food.map(f => f.logged_at?.slice(0, 10))).size;
    const totalCal = food.reduce((a, f) => a + (f.calories || 0), 0);
    const totalProt = food.reduce((a, f) => a + Number(f.protein || 0), 0);
    const avgCal = foodDays > 0 ? Math.round(totalCal / foodDays) : 0;
    const avgProt = foodDays > 0 ? Math.round(totalProt / foodDays) : 0;

    // Protein compliance
    const protByDay: Record<string, number> = {};
    food.forEach(f => {
      const d = f.logged_at?.slice(0, 10);
      protByDay[d] = (protByDay[d] || 0) + Number(f.protein || 0);
    });
    const protCompDays = Object.values(protByDay).filter(p => p >= 120).length;
    const protCompliance = foodDays > 0 ? Math.round((protCompDays / foodDays) * 100) : 0;

    // Top 5 foods
    const freq: Record<string, number> = {};
    food.forEach(f => {
      const k = (f.description || '').toLowerCase().trim();
      if (k) freq[k] = (freq[k] || 0) + 1;
    });
    const topFoods = Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 5);

    // Weight
    const wFirst = weights.length > 0 ? weights[0].weight : null;
    const wLast = weights.length > 0 ? weights[weights.length - 1].weight : null;
    const wDelta = wFirst && wLast ? Number((wLast - wFirst).toFixed(1)) : null;

    // Habits
    const gymDays = habits.filter(h => h.habit_type === 'gym' && h.completion_type === 'full').length;
    const bjjDays = habits.filter(h => h.habit_type === 'bjj' && h.completion_type === 'full').length;

    // Generate summary with Claude
    const summary = await callClaude(
      "Sos Brim, coach de Mati. Escribí un resumen mensual para mandar por email. Tono profesional pero directo y argentino. 3-4 párrafos cortos.",
      `Resumen de ${monthNames[lastMonth]} ${year}:
- Peso: ${wFirst || '?'}kg → ${wLast || '?'}kg (${wDelta !== null ? (wDelta > 0 ? '+' : '') + wDelta + 'kg' : 'sin datos'})
- Calorías prom: ${avgCal} kcal/día (${foodDays} días loggeados)
- Proteína prom: ${avgProt}g/día, cumplimiento ≥120g: ${protCompliance}%
- Gym: ${gymDays} sesiones, BJJ: ${bjjDays} sesiones
- Top comidas: ${topFoods.map(([n, c]) => n + ' (' + c + 'x)').join(', ')}

Escribí el email. Arrancá con "Mati, acá tenés los números de tu último mes." Cerrá con algo motivacional.`,
      { maxTokens: 500, temperature: 0.6 }
    );

    // Build HTML email
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:20px;color:#1e293b;">
  <div style="max-width:500px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;font-weight:900;">Brim Hub / Reporte Mensual</p>
    <h1 style="font-size:20px;font-weight:900;margin:8px 0 24px;">${monthNames[lastMonth]} ${year}</h1>

    <div style="white-space:pre-line;font-size:14px;line-height:1.7;color:#475569;">${summary}</div>

    <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">

    <table style="width:100%;font-size:13px;color:#64748b;">
      <tr><td>Peso</td><td style="text-align:right;font-weight:bold;color:#1e293b;">${wFirst || '?'} → ${wLast || '?'}kg ${wDelta !== null ? '(' + (wDelta > 0 ? '+' : '') + wDelta + 'kg)' : ''}</td></tr>
      <tr><td>Calorías prom</td><td style="text-align:right;font-weight:bold;color:#1e293b;">${avgCal} kcal/día</td></tr>
      <tr><td>Proteína prom</td><td style="text-align:right;font-weight:bold;color:#1e293b;">${avgProt}g/día (${protCompliance}% compliance)</td></tr>
      <tr><td>Sesiones</td><td style="text-align:right;font-weight:bold;color:#1e293b;">${gymDays} gym + ${bjjDays} bjj</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
    <p style="font-size:11px;color:#94a3b8;font-weight:bold;">TOP 5 COMIDAS</p>
    ${topFoods.map(([n, c]) => `<p style="font-size:13px;margin:4px 0;"><span style="text-transform:capitalize;">${n}</span> <span style="color:#94a3b8;">(${c}x)</span></p>`).join('')}

    <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
    <p style="font-size:10px;color:#cbd5e1;text-align:center;">Generado por Brim Hub · brim-hub.vercel.app</p>
  </div>
</body>
</html>`;

    // Send via Resend
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Brim Hub <noreply@brim-hub.vercel.app>",
          to: [MATI_EMAIL],
          subject: `📊 Reporte Mensual — ${monthNames[lastMonth]} ${year}`,
          html,
        }),
      });
      const emailData = await emailRes.json();
      return new Response(
        JSON.stringify({ sent: true, email_id: emailData.id, summary_preview: summary.slice(0, 200) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No Resend key — return HTML for manual sending
    return new Response(
      JSON.stringify({ sent: false, html, summary, note: "RESEND_API_KEY not configured. Set it in Supabase Edge Function secrets." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { callClaude } from "../_shared/anthropic.ts";
import { buildUserContext } from "../_shared/context.ts";

const MATI_ID = "c17e4105-4861-43c8-bf13-0d32f7818418";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Test 1: Claude API
    const reply = await callClaude(
      "Sos un asistente conciso. Respondé en una oración.",
      "Decime hola y confirmá que funcionás."
    );

    // Test 2: User context
    const context = await buildUserContext(MATI_ID);

    return new Response(
      JSON.stringify({
        status: "ok",
        claude: reply,
        context_summary: {
          today: context.today,
          habits_days: Object.keys(context.habits.last7days).length,
          food_days: Object.keys(context.food.last7days).length,
          weight_records: context.weight.recent.length,
          current_weight: context.weight.current,
          energy_avg: context.energy.avg,
          points_total: context.points.total,
          streak: context.points.streak,
          cycle: context.cycle.name,
          targets: context.targets,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

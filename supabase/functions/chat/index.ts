import { callClaude } from "../_shared/anthropic.ts";
import { buildUserContext } from "../_shared/context.ts";

const MATI_ID = "c17e4105-4861-43c8-bf13-0d32f7818418";

const SB_URL = "https://birpqzahbtfbxxtaqeth.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5MTE4MywiZXhwIjoyMDkwMDY3MTgzfQ.k8tjbC_fcUv34cPwo2Vcewu3eUe7GDjyOy3B9f9Jtnk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildSystemPrompt(ctx: Record<string, unknown>): string {
  return `Sos Brim, el coach personal de bienestar de Mati. Tu tono es directo, argentino informal, sin rodeos. No seas condescendiente. Celebrá los wins reales y señalá los problemas sin drama. Podés usar humor pero no te pases.

REGLAS:
1. Respondé SOLO basándote en los datos reales del usuario que te paso abajo
2. Si no hay data para algo, decilo: "No tenés comidas loggeadas hoy"
3. Usá números específicos: "Llevás 1.5L de agua, te faltan 1L"
4. Sugerí acciones concretas y alcanzables
5. Respuestas cortas: 3-5 oraciones máximo. No te explayes
6. No des consejos médicos
7. No uses emojis excesivos. Uno o dos está bien
8. Cuando hables de comida, pensá en comida argentina

DATOS ACTUALES DE MATI:
${JSON.stringify(ctx, null, 2)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Mensaje vacío" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context
    const ctx = await buildUserContext(MATI_ID);
    const systemPrompt = buildSystemPrompt(ctx as unknown as Record<string, unknown>);

    // Build user message with history context
    let fullMessage = "";
    if (history && Array.isArray(history) && history.length > 0) {
      fullMessage = history.slice(-6).map((m: {role:string;content:string}) =>
        (m.role === "user" ? "Mati: " : "Brim: ") + m.content
      ).join("\n") + "\nMati: " + message;
    } else {
      fullMessage = message;
    }

    // Non-streaming call
    const reply = await callClaude(systemPrompt, fullMessage, {
      maxTokens: 512,
      temperature: 0.7,
    });

    // Save messages to DB (fire and forget)
    fetch(`${SB_URL}/rest/v1/chat_messages`, {
      method: "POST",
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: MATI_ID,
        role: "user",
        content: message,
      }),
    });

    fetch(`${SB_URL}/rest/v1/chat_messages`, {
      method: "POST",
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: MATI_ID,
        role: "assistant",
        content: reply,
      }),
    });

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

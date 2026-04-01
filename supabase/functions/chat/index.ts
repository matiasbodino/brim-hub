import { streamClaude } from "../_shared/anthropic.ts";
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

    // Build messages array with history
    const messages: { role: string; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    // Call Claude with streaming via REST API
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        temperature: 0.7,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      return new Response(
        JSON.stringify({ error: "Claude error: " + err }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save user message to DB (fire and forget)
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

    // Stream response and collect full text for saving
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          // Save assistant message to DB
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
              content: fullResponse,
            }),
          });
          controller.close();
          return;
        }

        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          if (json === "[DONE]") continue;
          try {
            const event = JSON.parse(json);
            if (event.type === "content_block_delta" && event.delta?.text) {
              fullResponse += event.delta.text;
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ text: event.delta.text }) + "\n\n"));
            }
          } catch { /* skip */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

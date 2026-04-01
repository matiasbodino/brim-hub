import { callClaude } from "../_shared/anthropic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sos un nutricionista experto en comida argentina y latina. Tu trabajo es estimar macronutrientes de comidas descritas en lenguaje natural.

REGLAS:
1. Estimá porciones estándar de adulto argentino (no atleta, no dieta)
2. Conocés platos típicos: milanesas (napolitana ~500kcal, sola ~350), empanadas (~280 c/u), asado (porción ~400kcal), pastas (plato ~550kcal), pizza (porción ~300), guiso (plato ~450), choripán (~450), hamburguesa completa (~600), tostado j&q (~350), medialunas (c/u ~200), facturas (c/u ~250), mate cocido con tostadas (~200), café con leche + tostadas (~300)
3. Si no estás seguro de la porción, asumí porción normal de restaurante argentino
4. El campo confidence es: "high" si es un plato conocido con porciones claras, "medium" si hay ambigüedad en porciones, "low" si es muy vago o desconocido
5. El breakdown lista cada componente con sus kcal estimadas

RESPONDÉ EXCLUSIVAMENTE con un JSON válido, sin texto antes ni después. El formato:
{
  "meal_type": "almuerzo",
  "description": "Milanesa napolitana con ensalada mixta",
  "calories": 620,
  "protein": 38,
  "carbs": 42,
  "fat": 32,
  "confidence": "high",
  "breakdown": [
    {"item": "Milanesa napolitana", "calories": 500, "protein": 32, "carbs": 30, "fat": 28},
    {"item": "Ensalada mixta", "calories": 120, "protein": 6, "carbs": 12, "fat": 4}
  ]
}

Si el usuario dice algo que no es comida, respondé:
{"error": "No pude identificar comida en tu mensaje"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, meal_type } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Texto muy corto o vacío" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMsg = meal_type
      ? `${meal_type}: ${text.trim()}`
      : text.trim();

    const raw = await callClaude(SYSTEM_PROMPT, userMsg, {
      maxTokens: 512,
      temperature: 0.3,
    });

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed.error) {
      return new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    const result = {
      meal_type: parsed.meal_type || meal_type || "snack",
      description: parsed.description || text.trim(),
      calories: Math.round(Number(parsed.calories) || 0),
      protein: Math.round(Number(parsed.protein) || 0),
      carbs: Math.round(Number(parsed.carbs) || 0),
      fat: Math.round(Number(parsed.fat) || 0),
      confidence: parsed.confidence || "medium",
      breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error al parsear: " + String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

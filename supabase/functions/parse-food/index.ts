import { callClaude } from "../_shared/anthropic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sos un nutricionista experto en comida argentina y latina. Tu trabajo es estimar macronutrientes de comidas descritas en lenguaje natural.

PORCIONES ESTÁNDAR ARGENTINAS (si el usuario NO especifica cantidad):
- 1 bife / carne asada: 250g crudo (~200g cocido)
- 1 milanesa: 180g empanada (~350 sola, ~500 napolitana con jamón/queso/salsa)
- 1 empanada: ~280 kcal (carne ~300, jamón y queso ~260, humita ~240)
- Asado (porción normal): ~400g de carne variada (~600 kcal)
- Fernet con coca: ~250 kcal por vaso (3 medidas fernet + coca)
- Plato de pastas: ~250g cocidas + salsa = ~550 kcal
- Pizza: 2 porciones = ~600 kcal
- Guiso/locro: plato hondo = ~450 kcal
- Choripán: 1 chorizo + pan = ~450 kcal
- Hamburguesa completa: ~600 kcal
- Tostado J&Q: ~350 kcal
- Medialunas: c/u ~200 kcal
- Facturas: c/u ~250 kcal
- Ensalada: bowl mediano ~80 kcal SIN aderezo

ADEREZOS OCULTOS — REGLA CRÍTICA:
- Si hay ensalada, verduras grilladas, o cualquier plato que normalmente lleve aceite/aderezo:
  SIEMPRE incluir "1 cda aceite de oliva" (~120 kcal, 14g fat) en el breakdown
  Esto es para evitar subestimación por aderezos que el usuario no menciona
- Si hay pan o tostadas: asumir manteca o queso crema (~50 kcal)

REGLAS:
1. Estimá porciones estándar de hogar argentino (no atleta, no dieta)
2. Si no estás seguro de la porción, asumí porción normal de casa (no restaurante — restaurante es más grande)
3. confidence: "high" si es un plato conocido con porciones claras, "medium" si hay ambigüedad, "low" si es muy vago
4. El breakdown lista CADA componente con sus kcal estimadas, INCLUYENDO aderezos asumidos
5. query_adjustment: pregunta corta para refinar la estimación (porción, aderezo, preparación)

RESPONDÉ EXCLUSIVAMENTE con un JSON válido, sin texto antes ni después:
{
  "meal_type": "almuerzo",
  "description": "Milanesa napolitana con ensalada mixta",
  "calories": 740,
  "protein": 40,
  "carbs": 44,
  "fat": 46,
  "confidence": "high",
  "query_adjustment": "¿La ensalada tenía aceite o aderezo?",
  "breakdown": [
    {"item": "Milanesa napolitana (180g)", "calories": 500, "protein": 32, "carbs": 30, "fat": 28},
    {"item": "Ensalada mixta (bowl)", "calories": 80, "protein": 4, "carbs": 12, "fat": 2},
    {"item": "1 cda aceite de oliva (asumido)", "calories": 120, "protein": 0, "carbs": 0, "fat": 14},
    {"item": "Pan (1 rebanada)", "calories": 40, "protein": 4, "carbs": 2, "fat": 2}
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
      query_adjustment: parsed.query_adjustment || null,
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

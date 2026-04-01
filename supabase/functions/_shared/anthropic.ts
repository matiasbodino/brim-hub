// Direct Anthropic REST API calls (avoids SDK auth conflict with Supabase Edge Functions)

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

interface CallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options: CallOptions = {}
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "claude-sonnet-4-20250514",
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Anthropic API error: " + res.status + " " + err);
  }

  const data = await res.json();
  const block = data.content?.[0];
  if (block?.type === "text") return block.text;
  return "";
}

export async function streamClaude(
  systemPrompt: string,
  userMessage: string,
  options: CallOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "claude-sonnet-4-20250514",
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    throw new Error("Anthropic API error: " + res.status + " " + err);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      const text = decoder.decode(value);
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6);
        if (json === "[DONE]") continue;
        try {
          const event = JSON.parse(json);
          if (event.type === "content_block_delta" && event.delta?.text) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        } catch { /* skip non-JSON lines */ }
      }
    },
  });
}

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

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
  const response = await client.messages.create({
    model: options.model ?? "claude-sonnet-4-20250514",
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (block.type === "text") return block.text;
  return "";
}

export async function streamClaude(
  systemPrompt: string,
  userMessage: string,
  options: CallOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const stream = await client.messages.stream({
    model: options.model ?? "claude-sonnet-4-20250514",
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });
}

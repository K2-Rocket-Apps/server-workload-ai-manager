import type { AppConfig } from "./config.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const PROVIDERS = {
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "mistralai/mistral-small",
  },
} as const;

export class LlmClient {
  constructor(private readonly config: AppConfig["llm"]) {}

  async chat(messages: ChatMessage[], tools: ToolDefinition[] = []): Promise<ChatMessage> {
    const provider = PROVIDERS[this.config.provider];
    const payload: Record<string, unknown> = {
      model: this.config.model || provider.defaultModel,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.max_tokens,
    };
    if (tools.length) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.api_key}`,
      "Content-Type": "application/json",
    };
    if (this.config.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://k2tec.com";
      headers["X-Title"] = "Mistral PVE Agent";
    }

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`LLM API error (${res.status}): ${text.slice(0, 300)}`);
    }

    const json = JSON.parse(text) as { choices?: { message?: ChatMessage }[] };
    const message = json.choices?.[0]?.message;
    if (!message) throw new Error("LLM returned an unexpected response.");
    return message;
  }

  configured(): boolean {
    return Boolean(this.config.api_key);
  }
}

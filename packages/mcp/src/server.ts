import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { AppConfig } from "@mistral/core";
import { ToolRegistry } from "./tools.js";

export async function startStdioMcp(config: AppConfig): Promise<void> {
  const registry = new ToolRegistry(config);
  const server = new Server(
    { name: "pve-mistral", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registry.definitions().map((d) => ({
      name: d.function.name,
      description: d.function.description,
      inputSchema: d.function.parameters,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const text = await registry.execute(request.params.name, args);
    return { content: [{ type: "text", text }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function startHttpMcp(config: AppConfig): Promise<void> {
  const { createServer } = await import("node:http");
  const registry = new ToolRegistry(config);
  const host = config.mcp.http_host;
  const port = config.mcp.http_port;

  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/mcp") {
      res.writeHead(404);
      res.end();
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString()) as {
      method: string;
      id?: number;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };

    let result: unknown;
    if (body.method === "tools/list") {
      result = {
        tools: registry.definitions().map((d) => ({
          name: d.function.name,
          description: d.function.description,
          inputSchema: d.function.parameters,
        })),
      };
    } else if (body.method === "tools/call") {
      const text = await registry.execute(
        body.params?.name ?? "",
        body.params?.arguments ?? {},
      );
      result = { content: [{ type: "text", text }] };
    } else {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "unsupported method" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id ?? 1, result }));
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  console.log(`MCP HTTP listening on http://${host}:${port}/mcp`);
}

export { ToolRegistry } from "./tools.js";

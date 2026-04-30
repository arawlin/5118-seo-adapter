import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API_TOOL_NAMES } from "../src/config/apiKeyRegistry.js";
import { createServer } from "../src/server.js";

function createRegisterToolSpy() {
  return vi
    .spyOn(McpServer.prototype, "registerTool")
    .mockImplementation(() => ({}) as ReturnType<McpServer["registerTool"]>);
}

describe("server tool registration contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers every configured tool exactly once", () => {
    const registerSpy = createRegisterToolSpy();

    createServer();

    const registerCalls = registerSpy.mock.calls as Array<[string, unknown, unknown]>;
    const registeredNames = registerCalls.map((call) => call[0]);

    expect(new Set(registeredNames)).toEqual(new Set(API_TOOL_NAMES));
    expect(registeredNames).toHaveLength(API_TOOL_NAMES.length);
  });

  it("provides title and description for every tool", () => {
    const registerSpy = createRegisterToolSpy();

    createServer();

    const registerCalls = registerSpy.mock.calls as Array<[string, unknown, unknown]>;

    for (const [, config] of registerCalls) {
      const toolConfig = config as { title: string; description: string };
      expect(toolConfig.title.trim().length).toBeGreaterThan(0);
      expect(toolConfig.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("provides output schema for every tool", () => {
    const registerSpy = createRegisterToolSpy();

    createServer();

    const registerCalls = registerSpy.mock.calls as Array<[string, unknown, unknown]>;

    for (const [, config] of registerCalls) {
      const toolConfig = config as { outputSchema?: Record<string, unknown> };
      expect(toolConfig.outputSchema).toBeDefined();
      expect(Object.keys(toolConfig.outputSchema ?? {}).length).toBeGreaterThan(0);
    }
  });

  it("provides input schema for every tool", () => {
    const registerSpy = createRegisterToolSpy();

    createServer();

    const registerCalls = registerSpy.mock.calls as Array<[string, unknown, unknown]>;

    for (const [, config] of registerCalls) {
      const toolConfig = config as { inputSchema?: Record<string, unknown> };
      expect(toolConfig.inputSchema).toBeDefined();
      expect(Object.keys(toolConfig.inputSchema ?? {}).length).toBeGreaterThan(0);
    }
  });
});

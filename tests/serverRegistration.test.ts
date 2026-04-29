import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API_TOOL_NAMES } from "../src/config/apiKeyRegistry.js";
import { createServer } from "../src/server.js";

describe("server tool registration contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers every configured tool exactly once", () => {
    const registerSpy = vi
      .spyOn(McpServer.prototype, "registerTool")
      .mockImplementation(() => McpServer.prototype);

    createServer();

    const registeredNames = registerSpy.mock.calls.map((call) => call[0] as string);

    expect(new Set(registeredNames)).toEqual(new Set(API_TOOL_NAMES));
    expect(registeredNames).toHaveLength(API_TOOL_NAMES.length);
  });

  it("provides title and description for every tool", () => {
    const registerSpy = vi
      .spyOn(McpServer.prototype, "registerTool")
      .mockImplementation(() => McpServer.prototype);

    createServer();

    for (const [, config] of registerSpy.mock.calls) {
      const toolConfig = config as { title: string; description: string };
      expect(toolConfig.title.trim().length).toBeGreaterThan(0);
      expect(toolConfig.description.trim().length).toBeGreaterThan(0);
    }
  });
});

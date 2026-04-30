import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiToolName } from "../config/apiKeyRegistry.js";

export type RegisterTool = McpServer["registerTool"];

export interface ToolResultPayload {
  [key: string]: unknown;
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent: Record<string, unknown>;
}

export type ToToolResult = (
  toolName: ApiToolName,
  payload: unknown,
) => ToolResultPayload;
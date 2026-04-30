import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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

export const STRING_OR_NULL_OUTPUT_SCHEMA = z.string().nullable();
export const NUMBER_OR_NULL_OUTPUT_SCHEMA = z.number().nullable();
export const NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA = z.number().int().nonnegative();
export const NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA = z
  .number()
  .int()
  .nonnegative()
  .nullable();

export const PAGINATION_OUTPUT_SCHEMA = z.object({
  pageIndex: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
  pageSize: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
  pageCount: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
  total: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
});

export function createResponseOutputSchema(dataSchema: z.ZodTypeAny) {
  return {
    source: z.literal("5118"),
    sourceType: z.literal("official-api-backed"),
    tool: z.string(),
    apiName: z.string(),
    endpoint: z.string(),
    mode: z.enum(["sync", "async"]),
    executionStatus: z.enum(["completed", "pending", "failed"]),
    taskId: z.union([z.string(), z.number(), z.null()]),
    pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
    data: dataSchema.nullable(),
    warnings: z.array(z.string()),
    raw: z.unknown(),
  };
}

export function validateToolOutputPayload(
  toolName: ApiToolName,
  outputSchema: Record<string, z.ZodTypeAny>,
  payload: unknown,
): Record<string, unknown> {
  const validationResult = z.object(outputSchema).safeParse(payload);

  if (!validationResult.success) {
    const issueSummary = validationResult.error.issues
      .slice(0, 5)
      .map((issue) => {
        const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>";
        return `${issuePath}: ${issue.message}`;
      })
      .join("; ");

    throw new Error(
      `Output schema validation failed for ${toolName}: ${issueSummary}`,
    );
  }

  return validationResult.data;
}

export type ToToolResult = (payload: Record<string, unknown>) => ToolResultPayload;
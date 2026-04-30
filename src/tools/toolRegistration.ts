import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiToolName } from "../config/apiKeyRegistry.js";
import { mapInternalToolError } from "../lib/errorMapper.js";

export type RegisterTool = McpServer["registerTool"];

export interface ToolResultPayload {
  [key: string]: unknown;
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent: Record<string, unknown>;
}

type ToolOutputSchema = Record<string, z.ZodTypeAny>;

export const TOOL_OUTPUT_VALIDATION_ERROR_CODE = "TOOL_OUTPUT_SCHEMA_VALIDATION_FAILED";

const MAX_VALIDATION_ISSUES_IN_ERROR = 5;

interface ToolOutputValidationIssue {
  path: string;
  code: string;
  message: string;
}

function formatIssuePath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return "<root>";
  }

  return path
    .map((segment, index) => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }

      if (typeof segment === "symbol") {
        const symbolKey = segment.description ?? "symbol";
        return index === 0 ? symbolKey : `.${symbolKey}`;
      }

      return index === 0 ? segment : `.${segment}`;
    })
    .join("");
}

function formatValidationIssue(issue: z.ZodIssue): ToolOutputValidationIssue {
  return {
    path: formatIssuePath(issue.path),
    code: issue.code,
    message: issue.message,
  };
}

export class ToolOutputValidationError extends Error {
  readonly code = TOOL_OUTPUT_VALIDATION_ERROR_CODE;
  readonly toolName: ApiToolName;
  readonly issueCount: number;
  readonly issues: ToolOutputValidationIssue[];

  constructor(
    toolName: ApiToolName,
    issues: ToolOutputValidationIssue[],
    totalIssueCount: number,
  ) {
    const issueSummary = issues
      .map((issue) => `${issue.path} (${issue.code}): ${issue.message}`)
      .join("; ");
    const hiddenIssueCount = totalIssueCount - issues.length;
    const hiddenIssueSuffix =
      hiddenIssueCount > 0 ? `; +${hiddenIssueCount} more issues` : "";

    super(
      `[${TOOL_OUTPUT_VALIDATION_ERROR_CODE}] tool=${toolName}; issueCount=${totalIssueCount}; issues=${issueSummary}${hiddenIssueSuffix}`,
    );

    this.name = "ToolOutputValidationError";
    this.toolName = toolName;
    this.issueCount = totalIssueCount;
    this.issues = issues;
  }
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

function parseToolOutputPayload(
  toolName: ApiToolName,
  outputSchema: ToolOutputSchema,
  payload: unknown,
): Record<string, unknown> {
  const validationResult = z.object(outputSchema).safeParse(payload);

  if (!validationResult.success) {
    const issues = validationResult.error.issues
      .slice(0, MAX_VALIDATION_ISSUES_IN_ERROR)
      .map(formatValidationIssue);

    throw new ToolOutputValidationError(
      toolName,
      issues,
      validationResult.error.issues.length,
    );
  }

  return validationResult.data;
}

export function createToolResult(
  toolName: ApiToolName,
  outputSchema: ToolOutputSchema,
  payload: unknown,
): ToolResultPayload {
  let structuredContent: Record<string, unknown>;

  try {
    structuredContent = parseToolOutputPayload(toolName, outputSchema, payload);
  } catch (error) {
    if (error instanceof ToolOutputValidationError) {
      throw mapInternalToolError(error.code, error.message, {
        toolName: error.toolName,
        issueCount: error.issueCount,
        issues: error.issues,
      });
    }

    throw error;
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
  };
}
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

export const STRING_OR_NULL_OUTPUT_SCHEMA = z
  .string()
  .nullable()
  .describe(
    "String value normalized from the upstream payload. null indicates the upstream did not return a usable value (missing field, empty string, or non-string).",
  );
export const NUMBER_OR_NULL_OUTPUT_SCHEMA = z
  .number()
  .nullable()
  .describe(
    "Numeric value normalized from the upstream payload. null indicates the upstream did not return a parseable number for this field.",
  );
export const NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA = z
  .number()
  .int()
  .nonnegative()
  .describe("Non-negative integer counter (>=0).");
export const NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA = z
  .number()
  .int()
  .nonnegative()
  .nullable()
  .describe(
    "Non-negative integer (>=0) or null. null means the upstream did not provide a parseable count for this field; 0 means the upstream explicitly reported zero.",
  );

export const PAGINATION_OUTPUT_SCHEMA = z.object({
  pageIndex: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA.describe(
    "1-based current page number echoed from the upstream response. 0 only when the upstream omitted the field.",
  ),
  pageSize: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA.describe(
    "Number of items per page used by the upstream response.",
  ),
  pageCount: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA.describe(
    "Total number of pages available for the current query.",
  ),
  total: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA.describe(
    "Total number of items matching the query across all pages.",
  ),
});

export function createResponseOutputSchema(dataSchema: z.ZodTypeAny) {
  return {
    source: z
      .literal("5118")
      .describe("Stable string literal '5118' identifying the upstream data provider."),
    sourceType: z
      .literal("official-api-backed")
      .describe(
        "Stable string literal 'official-api-backed'. Indicates the payload was retrieved from an official 5118 REST endpoint, not scraped or synthesized.",
      ),
    tool: z
      .string()
      .describe("Stable MCP tool name that produced this envelope (e.g. get_longtail_keywords_5118)."),
    apiName: z
      .string()
      .describe("Human-readable upstream 5118 API name. Useful for logging and debugging only."),
    endpoint: z
      .string()
      .describe("Upstream 5118 endpoint path that was called (e.g. /keyword/word/v2)."),
    mode: z
      .enum(["sync", "async"])
      .describe(
        "Execution mode used by this invocation. 'sync' = one-shot HTTP call. 'async' = vendor task workflow (submit/poll/wait).",
      ),
    executionStatus: z
      .enum(["completed", "pending", "failed"])
      .describe(
        "Result lifecycle. 'completed' = data is final and `data` is populated. 'pending' = vendor task is still running; `taskId` is set and `data` may be null. 'failed' = the call surfaced an upstream error and `data` is null.",
      ),
    taskId: z
      .union([z.string(), z.number(), z.null()])
      .describe(
        "Vendor task identifier for async tools. Non-null when an async task was created; null for sync tools or when no task id was returned. Pass it back via the tool's `taskId` input to resume polling.",
      ),
    pagination: PAGINATION_OUTPUT_SCHEMA.nullable().describe(
      "Pagination object echoed from the upstream response, or null when the endpoint does not paginate (sync single-shot endpoints, async-pending responses, etc.).",
    ),
    data: dataSchema
      .nullable()
      .describe(
        "Normalized payload. null when executionStatus is 'pending' or 'failed', or when the upstream returned no data.",
      ),
    warnings: z
      .array(z.string())
      .describe(
        "Non-fatal advisory messages produced by the adapter. Always present; empty array means no warnings.",
      ),
    raw: z
      .unknown()
      .describe(
        "Verbatim upstream response body, retained for debugging and for fields not covered by the normalized schema. Do not rely on its structure; treat it as opaque.",
      ),
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
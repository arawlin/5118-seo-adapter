const DEFAULT_MESSAGE = "Unknown upstream error.";
const DEFAULT_INTERNAL_MESSAGE = "Internal tool execution error.";

export const INTERNAL_ERROR_CODE = "INTERNAL_ERROR";
export const INVALID_TOOL_OUTPUT_CODE = "INVALID_TOOL_OUTPUT";

export interface InternalToolErrorDetails {
  [key: string]: unknown;
}

export class ToolError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly details?: unknown;

  public constructor(
    code: string,
    message: string,
    retryable = false,
    details?: unknown,
  ) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

const RETRYABLE_CODES = new Set(["100102", "200107"]);

export function getErrcode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const raw = (payload as Record<string, unknown>).errcode;

  if (raw === undefined || raw === null) {
    return undefined;
  }

  return String(raw);
}

export function isVendorSuccess(payload: unknown): boolean {
  return getErrcode(payload) === "0";
}

export function map5118Error(
  errcode: string | number | undefined,
  errmsg: string | undefined,
  details?: unknown,
): ToolError {
  const code = String(errcode ?? "UNKNOWN");
  const message = errmsg?.trim() || DEFAULT_MESSAGE;
  const retryable = RETRYABLE_CODES.has(code);

  switch (code) {
    case "100101":
      return new ToolError("QUOTA_EXHAUSTED", message, false, details);
    case "100102":
      return new ToolError("RATE_LIMIT_PER_SECOND", message, true, details);
    case "100103":
      return new ToolError("RATE_LIMIT_PER_HOUR", message, false, details);
    case "100104":
      return new ToolError("RATE_LIMIT_PER_DAY", message, false, details);
    case "100202":
      return new ToolError("MISSING_API_KEY", message, false, details);
    case "100203":
      return new ToolError("INVALID_API_KEY", message, false, details);
    case "100204":
      return new ToolError("API_NOT_FOUND", message, false, details);
    case "100208":
      return new ToolError("INVALID_HTTP_METHOD", message, false, details);
    case "200103":
      return new ToolError("TASK_NOT_FOUND", message, false, details);
    case "200104":
      return new ToolError("TASK_PENDING", message, true, details);
    case "200107":
      return new ToolError("UPSTREAM_TIMEOUT", message, true, details);
    case "200121":
      return new ToolError("TARGET_NOT_SUPPORTED", message, false, details);
    case "200201":
    case "200203":
    case "200204":
    case "200301":
    case "200401":
      return new ToolError("INVALID_INPUT", message, false, details);
    case "101":
      return new ToolError("TASK_PENDING", message, true, details);
    default:
      return new ToolError("UPSTREAM_ERROR", message, retryable, details);
  }
}

export function mapInternalToolError(
  internalCode: string | undefined,
  message: string | undefined,
  details?: InternalToolErrorDetails,
): ToolError {
  const normalizedMessage = message?.trim() || DEFAULT_INTERNAL_MESSAGE;

  switch (internalCode) {
    case "TOOL_OUTPUT_SCHEMA_VALIDATION_FAILED":
      return new ToolError(INVALID_TOOL_OUTPUT_CODE, normalizedMessage, false, details);
    default:
      return new ToolError(INTERNAL_ERROR_CODE, normalizedMessage, false, details);
  }
}

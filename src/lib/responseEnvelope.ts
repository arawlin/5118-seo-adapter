import type { PaginationInfo, ResponseEnvelope, ToolMode } from "../types/toolContracts.js";

export interface CreateResponseEnvelopeInput<TData> {
  tool: string;
  apiName: string;
  endpoint: string;
  mode: ToolMode;
  executionStatus: ResponseEnvelope<TData>["executionStatus"];
  taskId?: string | number | null;
  pagination?: PaginationInfo | null;
  data?: TData | null;
  warnings?: string[];
  raw: unknown;
}

export function createResponseEnvelope<TData>(
  input: CreateResponseEnvelopeInput<TData>,
): ResponseEnvelope<TData> {
  return {
    source: "5118",
    sourceType: "official-api-backed",
    tool: input.tool,
    apiName: input.apiName,
    endpoint: input.endpoint,
    mode: input.mode,
    executionStatus: input.executionStatus,
    taskId: input.taskId ?? null,
    pagination: input.pagination ?? null,
    data: input.data ?? null,
    warnings: input.warnings ?? [],
    raw: input.raw,
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createPagination(
  pageIndex: unknown,
  pageSize: unknown,
  pageCount: unknown,
  total: unknown,
): PaginationInfo | null {
  const pIndex = toFiniteNumber(pageIndex);
  const pSize = toFiniteNumber(pageSize);
  const pCount = toFiniteNumber(pageCount);
  const pTotal = toFiniteNumber(total);

  if (
    pIndex === null &&
    pSize === null &&
    pCount === null &&
    pTotal === null
  ) {
    return null;
  }

  return {
    pageIndex: pIndex ?? 0,
    pageSize: pSize ?? 0,
    pageCount: pCount ?? 0,
    total: pTotal ?? 0,
  };
}

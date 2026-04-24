export type SyncMode = "sync";
export type AsyncExecutionMode = "submit" | "poll" | "wait";
export type ToolMode = SyncMode | "async";
export type ExecutionStatus = "completed" | "pending" | "failed";

export interface PaginationInfo {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ResponseEnvelope<TData = unknown> {
  source: "5118";
  sourceType: "official-api-backed";
  tool: string;
  apiName: string;
  endpoint: string;
  mode: ToolMode;
  executionStatus: ExecutionStatus;
  taskId: string | number | null;
  pagination: PaginationInfo | null;
  data: TData | null;
  warnings: string[];
  raw: unknown;
}

export interface AsyncControlInput {
  executionMode?: AsyncExecutionMode;
  taskId?: string | number;
  maxWaitSeconds?: number;
  pollIntervalSeconds?: number;
}

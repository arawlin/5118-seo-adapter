import Bottleneck from "bottleneck";
import pRetry from "p-retry";
import type { RequestControlConfig } from "../config/requestControl.js";
import { ToolError } from "./errorMapper.js";

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

const GLOBAL_LIMITER_KEY = "global";

function isLikelyNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) {
    const normalized = error.message.toLowerCase();

    return (
      normalized.includes("fetch") ||
      normalized.includes("network") ||
      normalized.includes("socket") ||
      normalized.includes("timed out") ||
      normalized.includes("econn")
    );
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : undefined;

    if (code === undefined) {
      return false;
    }

    return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(code);
  }

  return false;
}

export interface RetryExecutionOptions<TData> {
  operation: () => Promise<TData>;
  shouldRetry?: (error: unknown) => boolean;
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  jitterMs?: number;
  signal?: AbortSignal;
}

export interface ScheduleWithControlOptions<TData> {
  endpoint: string;
  apiKey: string;
  run: () => Promise<TData>;
}

export interface RequestController {
  buildLimiterKey: (endpoint: string, apiKey: string) => string;
  scheduleWithControl: <TData>(options: ScheduleWithControlOptions<TData>) => Promise<TData>;
  executeWithRetry: <TData>(options: RetryExecutionOptions<TData>) => Promise<TData>;
  isRetryableFailure: (error: unknown) => boolean;
}

export function createRequestController(config: RequestControlConfig): RequestController {
  const group = new Bottleneck.Group({
    minTime: config.minTimeMs,
    maxConcurrent: config.maxConcurrent,
    reservoir: config.reservoir,
    reservoirRefreshAmount: config.reservoirRefreshAmount,
    reservoirRefreshInterval: config.reservoirRefreshIntervalMs,
  });

  const buildLimiterKey = (_endpoint: string, _apiKey: string): string => {
    return GLOBAL_LIMITER_KEY;
  };

  const scheduleWithControl = async <TData>(
    options: ScheduleWithControlOptions<TData>,
  ): Promise<TData> => {
    const limiter = group.key(buildLimiterKey(options.endpoint, options.apiKey));
    return limiter.schedule(() => options.run());
  };

  const isRetryableFailure = (error: unknown): boolean => {
    if (error instanceof ToolError) {
      return error.retryable;
    }

    return isLikelyNetworkFailure(error);
  };

  const executeWithRetry = async <TData>(
    options: RetryExecutionOptions<TData>,
  ): Promise<TData> => {
    const shouldRetry = options.shouldRetry ?? isRetryableFailure;
    const maxRetries = options.maxRetries ?? config.maxRetries;
    const baseBackoffMs = options.baseBackoffMs ?? config.baseBackoffMs;
    const maxBackoffMs = options.maxBackoffMs ?? config.maxBackoffMs;
    const jitterMs = options.jitterMs ?? config.jitterMs;

    return pRetry(
      async () => {
        return options.operation();
      },
      {
        retries: Math.max(0, maxRetries),
        factor: 2,
        minTimeout: Math.max(0, baseBackoffMs),
        maxTimeout: Math.max(Math.max(0, baseBackoffMs), Math.max(0, maxBackoffMs)),
        randomize: false,
        signal: options.signal,
        shouldRetry: async (error) => shouldRetry(error),
        onFailedAttempt: async () => {
          const jitterDelayMs =
            jitterMs > 0 ? Math.floor(Math.random() * (Math.floor(jitterMs) + 1)) : 0;

          if (jitterDelayMs > 0) {
            await sleepMs(jitterDelayMs);
          }
        },
      },
    );
  };

  return {
    buildLimiterKey,
    scheduleWithControl,
    executeWithRetry,
    isRetryableFailure,
  };
}

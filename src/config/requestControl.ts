export interface RequestControlConfig {
  minTimeMs: number;
  maxConcurrent: number;
  reservoir: number;
  reservoirRefreshAmount: number;
  reservoirRefreshIntervalMs: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  jitterMs: number;
}

export const REQUEST_CONTROL_DEFAULTS: RequestControlConfig = {
  minTimeMs: 1500,
  maxConcurrent: 1,
  reservoir: 1,
  reservoirRefreshAmount: 1,
  reservoirRefreshIntervalMs: 1000,
  maxRetries: 2,
  baseBackoffMs: 1200,
  maxBackoffMs: 5000,
  jitterMs: 500,
};

export const REQUEST_CONTROL_ENV_KEYS = {
  minTimeMs: "MCP_5118_MIN_TIME_MS",
  maxConcurrent: "MCP_5118_MAX_CONCURRENT",
  reservoir: "MCP_5118_RESERVOIR",
  maxRetries: "MCP_5118_MAX_RETRIES",
  baseBackoffMs: "MCP_5118_BASE_BACKOFF_MS",
  maxBackoffMs: "MCP_5118_MAX_BACKOFF_MS",
  jitterMs: "MCP_5118_JITTER_MS",
} as const;

function parseIntegerEnv(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  minValue: number,
): number {
  const raw = env[key];

  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || !Number.isInteger(value) || value < minValue) {
    throw new Error(`${key} must be an integer greater than or equal to ${minValue}.`);
  }

  return value;
}

export function resolveRequestControlConfig(
  env: NodeJS.ProcessEnv = process.env,
): RequestControlConfig {
  const minTimeMs = parseIntegerEnv(
    env,
    REQUEST_CONTROL_ENV_KEYS.minTimeMs,
    REQUEST_CONTROL_DEFAULTS.minTimeMs,
    0,
  );

  const maxConcurrent = parseIntegerEnv(
    env,
    REQUEST_CONTROL_ENV_KEYS.maxConcurrent,
    REQUEST_CONTROL_DEFAULTS.maxConcurrent,
    1,
  );

  const reservoir = parseIntegerEnv(
    env,
    REQUEST_CONTROL_ENV_KEYS.reservoir,
    REQUEST_CONTROL_DEFAULTS.reservoir,
    1,
  );

  const maxRetries = parseIntegerEnv(
    env,
    REQUEST_CONTROL_ENV_KEYS.maxRetries,
    REQUEST_CONTROL_DEFAULTS.maxRetries,
    0,
  );

  const baseBackoffMs = parseIntegerEnv(
    env,
    REQUEST_CONTROL_ENV_KEYS.baseBackoffMs,
    REQUEST_CONTROL_DEFAULTS.baseBackoffMs,
    0,
  );

  const rawMaxBackoffMs = parseIntegerEnv(
    env,
    REQUEST_CONTROL_ENV_KEYS.maxBackoffMs,
    REQUEST_CONTROL_DEFAULTS.maxBackoffMs,
    0,
  );

  const jitterMs = parseIntegerEnv(
    env,
    REQUEST_CONTROL_ENV_KEYS.jitterMs,
    REQUEST_CONTROL_DEFAULTS.jitterMs,
    0,
  );

  const maxBackoffMs = Math.max(rawMaxBackoffMs, baseBackoffMs);

  return {
    minTimeMs,
    maxConcurrent,
    reservoir,
    reservoirRefreshAmount: reservoir,
    reservoirRefreshIntervalMs: REQUEST_CONTROL_DEFAULTS.reservoirRefreshIntervalMs,
    maxRetries,
    baseBackoffMs,
    maxBackoffMs,
    jitterMs,
  };
}

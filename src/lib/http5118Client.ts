import { resolveRequestControlConfig, type RequestControlConfig } from "../config/requestControl.js";
import { getErrcode, map5118Error, ToolError } from "./errorMapper.js";
import { createRequestController, type RequestController } from "./requestController.js";

export const BASE_URL = "https://apis.5118.com";
const RETRYABLE_VENDOR_CODES = new Set(["100102", "200107"]);

let requestControlConfig: RequestControlConfig | undefined;
let requestController: RequestController | undefined;

function getRequestControlRuntime(): {
  config: RequestControlConfig;
  controller: RequestController;
} {
  if (requestControlConfig !== undefined && requestController !== undefined) {
    return {
      config: requestControlConfig,
      controller: requestController,
    };
  }

  requestControlConfig = resolveRequestControlConfig(process.env);
  requestController = createRequestController(requestControlConfig);

  return {
    config: requestControlConfig,
    controller: requestController,
  };
}

function extractRetryableVendorError(payload: unknown): ToolError | undefined {
  const errcode = getErrcode(payload);

  if (errcode === undefined || !RETRYABLE_VENDOR_CODES.has(errcode)) {
    return undefined;
  }

  const errmsg =
    typeof payload === "object" && payload !== null
      ? String((payload as Record<string, unknown>).errmsg ?? "")
      : "";

  return map5118Error(errcode, errmsg, payload);
}

export function resetHttp5118ClientRuntimeForTests(): void {
  requestControlConfig = undefined;
  requestController = undefined;
}

function toFormStringValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(",");
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

export async function postForm(
  endpoint: string,
  apiKey: string,
  formData: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(formData)) {
    if (value === undefined || value === null) {
      continue;
    }

    params.set(key, toFormStringValue(value));
  }

  const { config, controller } = getRequestControlRuntime();

  return controller.executeWithRetry({
    maxRetries: config.maxRetries,
    baseBackoffMs: config.baseBackoffMs,
    maxBackoffMs: config.maxBackoffMs,
    jitterMs: config.jitterMs,
    shouldRetry: controller.isRetryableFailure,
    signal,
    operation: async () => {
      return controller.scheduleWithControl({
        endpoint,
        apiKey,
        run: async () => {
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "POST",
            headers: {
              Authorization: apiKey,
              "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            },
            body: params,
            signal,
          });

          if (!response.ok) {
            throw new ToolError(
              "HTTP_ERROR",
              `Upstream request failed with status ${response.status}.`,
              response.status >= 500,
              { status: response.status, endpoint },
            );
          }

          const text = await response.text();

          let payload: unknown;

          try {
            payload = JSON.parse(text);
          } catch {
            throw new ToolError("INVALID_JSON", "Upstream returned non-JSON payload.", false, {
              endpoint,
              payload: text,
            });
          }

          const retryableVendorError = extractRetryableVendorError(payload);

          if (retryableVendorError !== undefined) {
            throw retryableVendorError;
          }

          return payload;
        },
      });
    },
  });
}

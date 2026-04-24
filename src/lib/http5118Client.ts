import { ToolError } from "./errorMapper.js";

export const BASE_URL = "https://apis.5118.com";

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

  try {
    return JSON.parse(text);
  } catch {
    throw new ToolError("INVALID_JSON", "Upstream returned non-JSON payload.", false, {
      endpoint,
      payload: text,
    });
  }
}

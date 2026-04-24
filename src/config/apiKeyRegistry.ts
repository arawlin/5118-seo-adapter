export const API_TOOL_NAMES = [
  "get_longtail_keywords_5118",
  "get_industry_frequency_words_5118",
  "get_suggest_terms_5118",
  "get_keyword_metrics_5118",
  "get_mobile_traffic_keywords_5118",
] as const;

export type ApiToolName = (typeof API_TOOL_NAMES)[number];

export const SHARED_API_KEY_ENV = "API_KEY";

export function getRequiredEnvVar(toolName: ApiToolName): string {
  void toolName;
  return SHARED_API_KEY_ENV;
}

export function assertApiKey(
  toolName: ApiToolName,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envVar = getRequiredEnvVar(toolName);
  const apiKey = env[envVar]?.trim();

  if (!apiKey) {
    throw new Error(
      `Missing API key for ${toolName}. Required environment variable: ${envVar}.`,
    );
  }

  return apiKey;
}

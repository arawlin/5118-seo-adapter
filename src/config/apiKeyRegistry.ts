export const API_TOOL_ENV_MAP = {
  get_longtail_keywords_5118: "API_5118_LONGTAIL_V2",
  get_industry_frequency_words_5118: "API_5118_FREQ_WORDS",
  get_suggest_terms_5118: "API_5118_SUGGEST",
  get_keyword_metrics_5118: "API_5118_KW_PARAM_V2",
  get_mobile_traffic_keywords_5118: "API_5118_TRAFFIC",
} as const;

export type ApiToolName = keyof typeof API_TOOL_ENV_MAP;

export const API_TOOL_NAMES = Object.keys(API_TOOL_ENV_MAP) as ApiToolName[];

export function getRequiredEnvVar(toolName: ApiToolName): string {
  return API_TOOL_ENV_MAP[toolName];
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

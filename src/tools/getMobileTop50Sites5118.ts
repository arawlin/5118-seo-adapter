import { z } from "zod";
import {
  createTopSiteSnapshotHandler,
  TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA,
} from "./topSiteSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import type { TopSiteSnapshotsData } from "./topSiteSnapshotBase.js";

export const GET_MOBILE_TOP50_SITES_5118_INPUT_SCHEMA = {
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Optional maximum ranking depth to inspect. Maximum 100 for the mobile endpoint."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
} as const;

export type GetMobileTop50Sites5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_TOP50_SITES_5118_INPUT_SCHEMA>
>;
export type GetMobileTop50SitesInput = GetMobileTop50Sites5118Input;

const CONFIG = {
  toolName: "get_mobile_top50_sites_5118",
  apiName: "Mobile Top-50 Sites API",
  endpoint: "/keywordrank/baidumobile",
  maxCheckRow: 100,
} as const;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA);


export function registerGetMobileTop50Sites5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get Mobile Top50 Sites 5118",
      description: "Async mobile top-50 site snapshot via 5118 /keywordrank/baidumobile.",
      inputSchema: GET_MOBILE_TOP50_SITES_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getMobileTop50Sites5118Handler(input);
      return createToolResult(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getMobileTop50Sites5118Handler(
  input: GetMobileTop50Sites5118Input,
): Promise<ResponseEnvelope<TopSiteSnapshotsData>> {
  return createTopSiteSnapshotHandler(input, CONFIG);
}
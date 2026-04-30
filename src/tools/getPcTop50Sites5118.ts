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

export const GET_PC_TOP50_SITES_5118_INPUT_SCHEMA = {
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe(
      "Optional. Keywords to inspect (max 50 per task). Required for 'submit' and for 'wait' without a `taskId`. Each keyword's full top-N is returned independently.",
    ),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe(
      "Optional. Maximum SERP depth to capture per keyword. Range 1..100 (upstream cap). Upstream default is 50.",
    ),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe(
      "Optional. Async execution mode. Default 'wait'. 'submit'=create task and return taskId. 'poll'=fetch once. 'wait'=submit (or resume) and keep polling.",
    ),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe(
      "Optional. Existing vendor task identifier. Required in 'poll'. In 'wait', supply it to resume polling without re-submitting.",
    ),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional. Hard ceiling (seconds) on how long 'wait' polls before timing out."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional. Interval (seconds) between poll attempts. Defaults to 10."),
} as const;

export type GetPcTop50Sites5118Input = z.infer<
  z.ZodObject<typeof GET_PC_TOP50_SITES_5118_INPUT_SCHEMA>
>;
export type GetPcTop50SitesInput = GetPcTop50Sites5118Input;

const CONFIG = {
  toolName: "get_pc_top50_sites_5118",
  apiName: "PC Top-50 Sites API",
  endpoint: "/keywordrank/baidupc",
  maxCheckRow: 100,
} as const;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA);


export function registerGetPcTop50Sites5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get PC Top50 Sites 5118",
      description:
        [
          "Capture the full Baidu PC SERP top-N (up to 100 rows) for up to 50 keywords, including each ranking site's URL, page title, page URL, top100 flag, and 5118 weight.",
          "Use case: SERP analysis, competitor discovery, and content-gap planning when you need the full ranking landscape rather than the position of one target domain.",
          "Difference vs neighbors: get_pc_rank_snapshot_5118 only returns ranks for a target domain (filtered view); this tool returns every ranking site on the SERP. get_mobile_top50_sites_5118 is the mobile counterpart.",
          "Most actionable output fields: data.siteSnapshots[].keyword, .ranks[].siteUrl, .ranks[].rank, .ranks[].pageUrl, .ranks[].siteWeight; sort by rank asc to reconstruct the SERP.",
          "Async contract: defaults to 'wait'. Tasks usually complete within seconds.",
          "Known limits: keywords <= 50; checkRow <= 100; Baidu PC SERP only; one crawler region per task; no historical SERP.",
        ].join(" "),
      inputSchema: GET_PC_TOP50_SITES_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getPcTop50Sites5118Handler(input);
      return createToolResult(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getPcTop50Sites5118Handler(
  input: GetPcTop50Sites5118Input,
): Promise<ResponseEnvelope<TopSiteSnapshotsData>> {
  return createTopSiteSnapshotHandler(input, CONFIG);
}
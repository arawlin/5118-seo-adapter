import { z } from "zod";
import { createRankSnapshotHandler, RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA } from "./rankSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import type { RankSnapshotData } from "./rankSnapshotBase.js";

export const GET_PC_RANK_SNAPSHOT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional. Target domain or host to check ranks for (e.g. 'www.example.com'). Required for 'submit' and for 'wait' without a `taskId`. Do not include protocol or path.",
    ),
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe(
      "Optional. Keywords to check (max 50 per task). Required for 'submit' and for 'wait' without a `taskId`. Each keyword is queried independently against Baidu PC.",
    ),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .describe(
      "Optional. Maximum SERP depth to inspect per keyword. Range 1..50 (upstream cap on this PC endpoint). Upstream default is 50.",
    ),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe(
      "Optional. Async execution mode. Default 'wait'. 'submit'=create the task and return its taskId. 'poll'=fetch a previously submitted task once. 'wait'=submit (or resume) and keep polling.",
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
    .describe(
      "Optional. Hard ceiling (seconds) on how long 'wait' polls before returning a pending envelope.",
    ),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional. Interval (seconds) between poll attempts. Defaults to 60."),
} as const;

export type GetPcRankSnapshot5118Input = z.infer<
  z.ZodObject<typeof GET_PC_RANK_SNAPSHOT_5118_INPUT_SCHEMA>
>;
export type GetPcRankSnapshotInput = GetPcRankSnapshot5118Input;

const CONFIG = {
  toolName: "get_pc_rank_snapshot_5118",
  apiName: "PC Rank Snapshot API",
  endpoint: "/morerank/baidupc",
  maxCheckRow: 50,
} as const;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA);


export function registerGetPcRankSnapshot5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get PC Rank Snapshot 5118",
      description:
        [
          "Real-time Baidu PC SERP rank check for a target domain across up to 50 keywords. Returns each keyword's top-N rows (siteUrl, rank, pageTitle, pageUrl, top100, siteWeight) so you can find the queried domain's position.",
          "Use case: rank tracking, alerting on rank drops, and SERP analysis where you need a fresh, on-demand snapshot rather than a historical export.",
          "Difference vs neighbors: get_mobile_rank_snapshot_5118 is the mobile counterpart; get_pc_top50_sites_5118 returns the full top-N sites for a keyword (no target domain); get_domain_rank_keywords_5118 returns historical keyword exports without live SERP rows.",
          "Most actionable output fields: data.rankings[].keyword and data.rankings[].ranks[] (filter by `siteUrl` matching your domain to get its rank). rank=0 means the domain did not appear within `checkRow`.",
          "Async contract: defaults to 'wait' (submits and polls until done). The vendor task usually completes within seconds. Use 'submit'+'poll' for very latency-sensitive flows.",
          "Known limits: keywords <= 50; checkRow <= 50; Baidu PC SERP only; results reflect a single crawler region/IP per task; no historical data.",
        ].join(" "),
      inputSchema: GET_PC_RANK_SNAPSHOT_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getPcRankSnapshot5118Handler(input);
      return createToolResult(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getPcRankSnapshot5118Handler(
  input: GetPcRankSnapshot5118Input,
): Promise<ResponseEnvelope<RankSnapshotData>> {
  return createRankSnapshotHandler(input, CONFIG);
}
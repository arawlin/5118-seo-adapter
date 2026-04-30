import { z } from "zod";
import { createRankSnapshotHandler, RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA } from "./rankSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import type { RankSnapshotData } from "./rankSnapshotBase.js";

export const GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional. Target domain or host to check ranks for (e.g. 'm.example.com'). Required for 'submit' and for 'wait' without a `taskId`. Do not include protocol or path.",
    ),
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe(
      "Optional. Keywords to check (max 50 per task). Required for 'submit' and for 'wait' without a `taskId`. Each keyword is queried against Baidu Mobile.",
    ),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe(
      "Optional. Maximum SERP depth to inspect per keyword. Range 1..100 (mobile endpoint allows deeper inspection than PC). Upstream default is 50.",
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
    .describe("Optional. Interval (seconds) between poll attempts. Defaults to 60."),
} as const;

export type GetMobileRankSnapshot5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA>
>;
export type GetMobileRankSnapshotInput = GetMobileRankSnapshot5118Input;

const CONFIG = {
  toolName: "get_mobile_rank_snapshot_5118",
  apiName: "Mobile Rank Snapshot API",
  endpoint: "/morerank/baidumobile",
  maxCheckRow: 100,
} as const;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA);


export function registerGetMobileRankSnapshot5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get Mobile Rank Snapshot 5118",
      description:
        [
          "Real-time Baidu Mobile SERP rank check for a target domain across up to 50 keywords. Returns each keyword's top-N rows so you can find the queried domain's mobile rank position.",
          "Use case: mobile rank tracking and alerting; complements the PC snapshot for sites where mobile traffic dominates.",
          "Difference vs neighbors: get_pc_rank_snapshot_5118 is the PC counterpart (max checkRow=50 there vs 100 here); get_mobile_top50_sites_5118 returns the full top-N for a keyword without filtering by domain.",
          "Most actionable output fields: data.rankings[].ranks[] filtered by `siteUrl`. rank=0 means the domain did not appear within `checkRow`.",
          "Async contract: defaults to 'wait'. Vendor task typically completes within seconds.",
          "Known limits: keywords <= 50; checkRow <= 100; Baidu Mobile only; one crawler region per task; no historical data.",
        ].join(" "),
      inputSchema: GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getMobileRankSnapshot5118Handler(input);
      return createToolResult(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getMobileRankSnapshot5118Handler(
  input: GetMobileRankSnapshot5118Input,
): Promise<ResponseEnvelope<RankSnapshotData>> {
  return createRankSnapshotHandler(input, CONFIG);
}
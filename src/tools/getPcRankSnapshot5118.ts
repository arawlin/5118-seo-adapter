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
    .describe("Optional target domain for submit or wait mode. Required unless taskId is used to resume polling."),
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .describe("Optional maximum ranking depth to inspect. Maximum 50 for the PC endpoint."),
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
      description: "Async PC rank snapshot via 5118 /morerank/baidupc.",
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
import { z } from "zod";
import { createRankSnapshotHandler, RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA } from "./rankSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  validateToolOutputPayload,
  type RegisterTool,
  type ToToolResult,
} from "./toolRegistration.js";
import type { RankSnapshotData } from "./rankSnapshotBase.js";

export const GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA = {
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
  toToolResult: ToToolResult,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get Mobile Rank Snapshot 5118",
      description: "Async mobile rank snapshot via 5118 /morerank/baidumobile.",
      inputSchema: GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getMobileRankSnapshot5118Handler(input);
      return toToolResult(validateToolOutputPayload(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload));
    },
  );
}

export async function getMobileRankSnapshot5118Handler(
  input: GetMobileRankSnapshot5118Input,
): Promise<ResponseEnvelope<RankSnapshotData>> {
  return createRankSnapshotHandler(input, CONFIG);
}
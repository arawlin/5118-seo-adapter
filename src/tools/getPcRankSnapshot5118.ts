import { createRankSnapshotHandler, type RankSnapshotInput } from "./rankSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { RankSnapshotData } from "../types/toolDataContracts.js";

export type GetPcRankSnapshotInput = RankSnapshotInput;

const CONFIG = {
  toolName: "get_pc_rank_snapshot_5118",
  apiName: "PC Rank Snapshot API",
  endpoint: "/morerank/baidupc",
  maxCheckRow: 50,
} as const;

export async function getPcRankSnapshot5118Handler(
  input: GetPcRankSnapshotInput,
): Promise<ResponseEnvelope<RankSnapshotData>> {
  return createRankSnapshotHandler(input, CONFIG);
}
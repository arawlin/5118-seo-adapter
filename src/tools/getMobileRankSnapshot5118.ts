import { createRankSnapshotHandler, type RankSnapshotInput } from "./rankSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { RankSnapshotData } from "../types/toolDataContracts.js";

export type GetMobileRankSnapshotInput = RankSnapshotInput;

const CONFIG = {
  toolName: "get_mobile_rank_snapshot_5118",
  apiName: "Mobile Rank Snapshot API",
  endpoint: "/morerank/baidumobile",
  maxCheckRow: 100,
} as const;

export async function getMobileRankSnapshot5118Handler(
  input: GetMobileRankSnapshotInput,
): Promise<ResponseEnvelope<RankSnapshotData>> {
  return createRankSnapshotHandler(input, CONFIG);
}
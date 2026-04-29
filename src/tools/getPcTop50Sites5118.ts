import { createTopSiteSnapshotHandler, type TopSiteSnapshotInput } from "./topSiteSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { TopSiteSnapshotsData } from "../types/toolDataContracts.js";

export type GetPcTop50SitesInput = TopSiteSnapshotInput;

const CONFIG = {
  toolName: "get_pc_top50_sites_5118",
  apiName: "PC Top-50 Sites API",
  endpoint: "/keywordrank/baidupc",
  maxCheckRow: 100,
} as const;

export async function getPcTop50Sites5118Handler(
  input: GetPcTop50SitesInput,
): Promise<ResponseEnvelope<TopSiteSnapshotsData>> {
  return createTopSiteSnapshotHandler(input, CONFIG);
}
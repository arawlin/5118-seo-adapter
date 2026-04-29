import { createTopSiteSnapshotHandler, type TopSiteSnapshotInput } from "./topSiteSnapshotBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { TopSiteSnapshotsData } from "../types/toolOutputSchemas.js";

export type GetMobileTop50SitesInput = TopSiteSnapshotInput;

const CONFIG = {
  toolName: "get_mobile_top50_sites_5118",
  apiName: "Mobile Top-50 Sites API",
  endpoint: "/keywordrank/baidumobile",
  maxCheckRow: 100,
} as const;

export async function getMobileTop50Sites5118Handler(
  input: GetMobileTop50SitesInput,
): Promise<ResponseEnvelope<TopSiteSnapshotsData>> {
  return createTopSiteSnapshotHandler(input, CONFIG);
}
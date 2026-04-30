import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_TOOL_NAMES } from "./config/apiKeyRegistry.js";
import { registerCheckUrlIndexing5118Tool } from "./tools/checkUrlIndexing5118.js";
import { registerGetBidKeywords5118Tool } from "./tools/getBidKeywords5118.js";
import { registerGetBidSites5118Tool } from "./tools/getBidSites5118.js";
import { registerGetDomainRankKeywords5118Tool } from "./tools/getDomainRankKeywords5118.js";
import { registerGetIndustryFrequencyWords5118Tool } from "./tools/getIndustryFrequencyWords5118.js";
import { registerGetKeywordMetrics5118Tool } from "./tools/getKeywordMetrics5118.js";
import { registerGetLongtailKeywords5118Tool } from "./tools/getLongtailKeywords5118.js";
import { registerGetMobileRankSnapshot5118Tool } from "./tools/getMobileRankSnapshot5118.js";
import { registerGetMobileSiteRankKeywords5118Tool } from "./tools/getMobileSiteRankKeywords5118.js";
import { registerGetMobileTop50Sites5118Tool } from "./tools/getMobileTop50Sites5118.js";
import { registerGetMobileTrafficKeywords5118Tool } from "./tools/getMobileTrafficKeywords5118.js";
import { registerGetPcRankSnapshot5118Tool } from "./tools/getPcRankSnapshot5118.js";
import { registerGetPcSiteRankKeywords5118Tool } from "./tools/getPcSiteRankKeywords5118.js";
import { registerGetPcTop50Sites5118Tool } from "./tools/getPcTop50Sites5118.js";
import { registerGetSiteWeight5118Tool } from "./tools/getSiteWeight5118.js";
import { registerGetSuggestTerms5118Tool } from "./tools/getSuggestTerms5118.js";

export const REGISTERED_TOOL_NAMES = API_TOOL_NAMES;

type RegisteredToolName = (typeof REGISTERED_TOOL_NAMES)[number];
type RegisterToolMethod = McpServer["registerTool"];

function createToolRegistrar(server: McpServer) {
  const registeredToolNames = new Set<RegisteredToolName>();

  const registerTool: RegisterToolMethod = (name, config, handler) => {
    if (!REGISTERED_TOOL_NAMES.includes(name as RegisteredToolName)) {
      throw new Error(`Unsupported tool registration: ${name}.`);
    }

    registeredToolNames.add(name as RegisteredToolName);

    return server.registerTool(name, config, handler);
  };

  function assertToolCoverage(): void {
    const missing = REGISTERED_TOOL_NAMES.filter(
      (toolName) => !registeredToolNames.has(toolName),
    );

    if (missing.length > 0) {
      throw new Error(
        `Tool registration mismatch. Missing registrations: ${missing.join(", ")}.`,
      );
    }
  }

  return { registerTool, assertToolCoverage };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "5118-seo-adapter",
    version: "0.1.0",
  });

  const { registerTool, assertToolCoverage } = createToolRegistrar(server);

  registerGetLongtailKeywords5118Tool(registerTool);
  registerGetIndustryFrequencyWords5118Tool(registerTool);
  registerGetSuggestTerms5118Tool(registerTool);
  registerGetKeywordMetrics5118Tool(registerTool);
  registerGetMobileTrafficKeywords5118Tool(registerTool);
  registerGetDomainRankKeywords5118Tool(registerTool);
  registerGetBidKeywords5118Tool(registerTool);
  registerGetPcSiteRankKeywords5118Tool(registerTool);
  registerGetMobileSiteRankKeywords5118Tool(registerTool);
  registerGetBidSites5118Tool(registerTool);
  registerGetSiteWeight5118Tool(registerTool);
  registerGetPcRankSnapshot5118Tool(registerTool);
  registerGetMobileRankSnapshot5118Tool(registerTool);
  registerGetPcTop50Sites5118Tool(registerTool);
  registerGetMobileTop50Sites5118Tool(registerTool);
  registerCheckUrlIndexing5118Tool(registerTool);

  assertToolCoverage();

  return server;
}

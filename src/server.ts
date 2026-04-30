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
import { validateToolOutputEnvelope } from "./types/toolOutputSchemas.js";

export const REGISTERED_TOOL_NAMES = API_TOOL_NAMES;

type RegisteredToolName = (typeof REGISTERED_TOOL_NAMES)[number];
type RegisterToolMethod = McpServer["registerTool"];

function toToolResult(toolName: RegisteredToolName, payload: unknown) {
  const validationResult = validateToolOutputEnvelope(toolName, payload);

  if (!validationResult.success) {
    const issueSummary = validationResult.error.issues
      .slice(0, 5)
      .map((issue) => {
        const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>";
        return `${issuePath}: ${issue.message}`;
      })
      .join("; ");

    throw new Error(
      `Output schema validation failed for ${toolName}: ${issueSummary}`,
    );
  }

  const structuredContent = validationResult.data;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
  };
}

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

  registerGetLongtailKeywords5118Tool(registerTool, toToolResult);
  registerGetIndustryFrequencyWords5118Tool(registerTool, toToolResult);
  registerGetSuggestTerms5118Tool(registerTool, toToolResult);
  registerGetKeywordMetrics5118Tool(registerTool, toToolResult);
  registerGetMobileTrafficKeywords5118Tool(registerTool, toToolResult);
  registerGetDomainRankKeywords5118Tool(registerTool, toToolResult);
  registerGetBidKeywords5118Tool(registerTool, toToolResult);
  registerGetPcSiteRankKeywords5118Tool(registerTool, toToolResult);
  registerGetMobileSiteRankKeywords5118Tool(registerTool, toToolResult);
  registerGetBidSites5118Tool(registerTool, toToolResult);
  registerGetSiteWeight5118Tool(registerTool, toToolResult);
  registerGetPcRankSnapshot5118Tool(registerTool, toToolResult);
  registerGetMobileRankSnapshot5118Tool(registerTool, toToolResult);
  registerGetPcTop50Sites5118Tool(registerTool, toToolResult);
  registerGetMobileTop50Sites5118Tool(registerTool, toToolResult);
  registerCheckUrlIndexing5118Tool(registerTool, toToolResult);

  assertToolCoverage();

  return server;
}

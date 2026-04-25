import { describe, expect, it } from "vitest";
import { decodeResponseStrings, encodeInputFields } from "../src/lib/urlCodec.js";

describe("urlCodec", () => {
  it("returns plain strings when encoding is temporarily disabled", () => {
    const encoded = encodeInputFields(
      {
        keyword: "比特币价格",
        page_index: 1,
      },
      ["keyword"],
    );

    expect(encoded.keyword).toBe("比特币价格");
    expect(encoded.page_index).toBe("1");
  });

  it("decodes nested string values safely", () => {
    const decoded = decodeResponseStrings({
      keyword: "%E6%AF%94%E7%89%B9%E5%B8%81",
      nested: {
        url: "https%3A%2F%2Fexample.com%2Fbtc",
      },
    });

    expect(decoded.keyword).toBe("比特币");
    expect(decoded.nested.url).toBe("https://example.com/btc");
  });
});

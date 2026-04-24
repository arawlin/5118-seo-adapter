import { readFile } from "node:fs/promises";
import path from "node:path";

const FIXTURE_ROOT = "/Users/axe/work/seo/5118-seo-adapter/tests/fixtures/wave-one";

export async function readFixture<T>(name: string): Promise<T> {
  const filePath = path.join(FIXTURE_ROOT, name);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

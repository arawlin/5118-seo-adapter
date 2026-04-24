function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function safeDecode(value: string): string {
  const hasEncodedByte = /%[0-9A-Fa-f]{2}/.test(value);

  if (!hasEncodedByte && !value.includes("+")) {
    return value;
  }

  try {
    return decodeURIComponent(value.replace(/\+/g, "%20"));
  } catch {
    return value;
  }
}

export function encodeInputFields(
  input: Record<string, unknown>,
  encodeKeys?: string[],
): Record<string, string> {
  const keySet = encodeKeys ? new Set(encodeKeys) : null;
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }

    const shouldEncode = keySet ? keySet.has(key) : typeof value === "string";
    const valueAsString =
      typeof value === "string"
        ? value
        : Array.isArray(value)
          ? value.join(",")
          : isPlainObject(value)
            ? JSON.stringify(value)
            : String(value);

    output[key] = shouldEncode ? encodeURIComponent(valueAsString) : valueAsString;
  }

  return output;
}

export function decodeResponseStrings<T>(value: T): T {
  if (typeof value === "string") {
    return safeDecode(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => decodeResponseStrings(item)) as T;
  }

  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      output[key] = decodeResponseStrings(item);
    }

    return output as T;
  }

  return value;
}

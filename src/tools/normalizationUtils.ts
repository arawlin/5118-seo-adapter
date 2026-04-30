export function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toStringOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value);
  return text.length > 0 ? text : null;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function firstArray(data: Record<string, unknown>, keys: readonly string[]): unknown[] {
  for (const key of keys) {
    const value = asArray(data[key]);
    if (value.length > 0) {
      return value;
    }
  }

  return [];
}

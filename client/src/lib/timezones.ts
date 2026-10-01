/** Every IANA timezone the browser knows, with `current` guaranteed to be in the list. */
export function timezoneList(current: string): string[] {
  const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return list.includes(current) ? list : [current, ...list];
}

/** The timezone the browser reports, or undefined if it can't say. */
export function browserTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

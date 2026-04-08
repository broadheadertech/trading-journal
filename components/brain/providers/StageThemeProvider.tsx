'use client';

/**
 * No-op since the brain feature was removed. Kept as a passthrough so existing
 * imports/wrappers don't break.
 */
export function StageThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

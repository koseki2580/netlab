const STORAGE_KEY = 'netlab.sandbox.width';
export const SANDBOX_MIN_WIDTH = 280;
export const SANDBOX_MAX_VW_RATIO = 0.5;
export const SANDBOX_MAX_ABS_WIDTH = 720;
export const SANDBOX_DEFAULT_WIDTH = 320;

export function clampSandboxWidth(px: number, viewportWidth: number): number {
  const max = Math.min(viewportWidth * SANDBOX_MAX_VW_RATIO, SANDBOX_MAX_ABS_WIDTH);
  const effectiveMin = Math.min(SANDBOX_MIN_WIDTH, max);
  return Math.min(Math.max(px, effectiveMin), max);
}

function safeGet(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSet(value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // swallow quota / availability errors
  }
}

export function readSandboxWidth(viewportWidth: number): number {
  const raw = safeGet();
  const parsed = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(parsed)) {
    return clampSandboxWidth(SANDBOX_DEFAULT_WIDTH, viewportWidth);
  }
  return clampSandboxWidth(parsed, viewportWidth);
}

export function writeSandboxWidth(px: number): void {
  safeSet(String(Math.round(px)));
}

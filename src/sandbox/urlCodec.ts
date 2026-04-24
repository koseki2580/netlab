import { isEdit, type Edit } from './edits';

export const SANDBOX_STATE_PARAM = 'sandboxState';

interface SerializedSandboxState {
  readonly version: 1;
  readonly edits: readonly unknown[];
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeSandboxEdits(edits: readonly Edit[]): string | null {
  if (edits.length === 0) {
    return null;
  }

  const payload: SerializedSandboxState = {
    version: 1,
    edits,
  };

  return toBase64Url(JSON.stringify(payload));
}

export function decodeSandboxEdits(search: string): Edit[] {
  const raw = new URLSearchParams(search).get(SANDBOX_STATE_PARAM);
  if (!raw) {
    return [];
  }

  const decoded = fromBase64Url(raw);
  if (!decoded) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== 'object' || parsed === null) {
      return [];
    }

    const edits = (parsed as { edits?: unknown }).edits;
    if (!Array.isArray(edits)) {
      return [];
    }

    return edits.filter(isEdit);
  } catch {
    return [];
  }
}

export function updateSandboxSearch(search: string, edits: readonly Edit[]): string {
  const params = new URLSearchParams(search);
  const encoded = encodeSandboxEdits(edits);

  if (encoded) {
    params.set(SANDBOX_STATE_PARAM, encoded);
  } else {
    params.delete(SANDBOX_STATE_PARAM);
  }

  const next = params.toString();
  return next.length === 0 ? '' : `?${next}`;
}

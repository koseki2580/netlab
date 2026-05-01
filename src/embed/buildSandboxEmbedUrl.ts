import { SANDBOX_STATE_PARAM } from '../sandbox/urlCodec';
import type { EmbedUrlParams } from './protocol';

const RELATIVE_BASE = 'https://netlab.local';
const SCHEME_RE = /^[a-z][a-z\d+\-.]*:/i;

function isAbsoluteUrl(value: string): boolean {
  return SCHEME_RE.test(value);
}

function applyOptionalParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value === undefined) return;
  params.set(key, value);
}

export function buildSandboxEmbedUrl(params: EmbedUrlParams): string {
  const absolute = isAbsoluteUrl(params.baseUrl);
  const url = new URL(params.baseUrl, absolute ? undefined : RELATIVE_BASE);

  if (params.sandboxEnabled !== false) {
    url.searchParams.set('sandbox', '1');
  } else {
    url.searchParams.delete('sandbox');
  }
  url.searchParams.set('scenario', params.scenarioId);
  applyOptionalParam(url.searchParams, 'embedMode', params.embedMode);
  applyOptionalParam(url.searchParams, 'tutorial', params.tutorialId);
  applyOptionalParam(url.searchParams, 'assessment', params.assessmentId);
  applyOptionalParam(url.searchParams, 'replay', params.replayUrl);
  applyOptionalParam(url.searchParams, SANDBOX_STATE_PARAM, params.edits);
  if (params.parentOrigin !== undefined) {
    url.searchParams.delete('parentOrigin');
    const origins =
      typeof params.parentOrigin === 'string' ? [params.parentOrigin] : params.parentOrigin;
    for (const origin of origins) {
      url.searchParams.append('parentOrigin', origin);
    }
  }

  if (absolute) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

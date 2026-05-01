import type { NetlabEmbedMode, ParentOrigin } from '../src/embed/protocol';

export interface DemoEmbedParams {
  readonly embedMode?: NetlabEmbedMode;
  readonly parentOrigin?: ParentOrigin;
  readonly embedded: boolean;
}

export function readDemoEmbedParams(search: string = window.location.search): DemoEmbedParams {
  const params = new URLSearchParams(search);
  const rawEmbedMode = params.get('embedMode');
  const embedMode =
    rawEmbedMode === 'compact' || rawEmbedMode === 'minimal' ? rawEmbedMode : undefined;
  const parentOrigin = params.getAll('parentOrigin');

  return {
    ...(embedMode !== undefined ? { embedMode } : {}),
    ...(parentOrigin.length > 0 ? { parentOrigin } : {}),
    embedded: embedMode !== undefined,
  };
}

import type { EvpnMacIpEntry } from '../../../types/tunneling';

export function answerArpFromEvpnCache(
  entries: readonly EvpnMacIpEntry[],
  request: { readonly vni: number; readonly targetIp: string },
):
  | { readonly action: 'reply'; readonly mac: string; readonly remoteVtepIp: string }
  | { readonly action: 'flood' } {
  const hit = entries.find((entry) => entry.vni === request.vni && entry.ip === request.targetIp);
  return hit
    ? { action: 'reply', mac: hit.mac, remoteVtepIp: hit.remoteVtepIp }
    : { action: 'flood' };
}

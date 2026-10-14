import { describe, expect, it } from 'vitest';
import { AREA_NAMES, CLIENT_SERVER_INITIAL_TOPOLOGY } from './ClientServerDemo';

describe('the two areas of the client–server lesson', () => {
  /**
   * TC-630 — the sender's address reaches the far side unchanged here, so the
   * areas are not called "private" and "public", the words the NAT lesson uses
   * for an address that is rewritten on its way out.
   */
  it('are named for whose network each is, in both languages', () => {
    const ids = CLIENT_SERVER_INITIAL_TOPOLOGY.areas.map((area) => area.id);
    for (const locale of ['en', 'ja'] as const) {
      for (const id of ids) {
        const name = AREA_NAMES[locale][id];
        expect(name, `${locale}.${id}`).toBeTruthy();
        expect(name).not.toMatch(/private|public|プライベート|パブリック|グローバル/i);
      }
    }
    expect(AREA_NAMES.ja.private).toBe('Client のネットワーク');
    expect(AREA_NAMES.ja.public).toBe('Server のネットワーク');
    for (const area of CLIENT_SERVER_INITIAL_TOPOLOGY.areas) {
      expect(area.name).not.toMatch(/private|public/i);
    }
  });
});

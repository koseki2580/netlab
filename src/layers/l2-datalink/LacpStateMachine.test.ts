import { describe, expect, it } from 'vitest';
import { receiveLacpPdu } from './LacpStateMachine';

describe('LacpStateMachine', () => {
  it('moves matching active peers to distributing', () => {
    expect(
      receiveLacpPdu(
        { state: 'defaulted', config: { key: 10, systemId: '00:11:22:33:44:55', mode: 'active' } },
        { key: 10, systemId: '66:77:88:99:aa:bb', synchronized: true, aggregation: true },
      ).state,
    ).toBe('distributing');
  });

  it('keeps mismatched keys current but not distributing', () => {
    expect(
      receiveLacpPdu(
        { state: 'defaulted', config: { key: 10, systemId: '00:11:22:33:44:55', mode: 'active' } },
        { key: 20, systemId: '66:77:88:99:aa:bb', synchronized: true, aggregation: true },
      ).state,
    ).toBe('current');
  });
});

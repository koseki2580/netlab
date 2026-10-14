import { describe, expect, it } from 'vitest';
import { fetchStory, leasedAddressCss } from './DhcpDnsDemo';

describe('what the DHCP/DNS lesson says its second button ran', () => {
  /** TC-625 — look the name up, open a connection, then fetch: the handshake is counted from what was sent. */
  it('reads a first press as lookup, three handshake messages, a request and its answer', () => {
    const story = fetchStory([
      'DNS QUERY',
      'DNS RESPONSE',
      'TCP SYN',
      'TCP SYN-ACK',
      'TCP ACK',
      'HTTP GET',
      'HTTP 200',
    ]);
    expect(story).toEqual({
      lookedUp: true,
      handshake: ['TCP SYN', 'TCP SYN-ACK', 'TCP ACK'],
      asked: true,
      answered: true,
    });
  });

  /** TC-625 — a second press finds the name remembered, and the summary does not claim a lookup. */
  it('reads a press with the name remembered as no lookup', () => {
    const story = fetchStory(['TCP SYN', 'TCP SYN-ACK', 'TCP ACK', 'HTTP GET', 'HTTP 200']);
    expect(story.lookedUp).toBe(false);
    expect(story.handshake).toHaveLength(3);
    expect(story.answered).toBe(true);
  });

  it('claims nothing that was not sent', () => {
    expect(fetchStory(['DNS QUERY', undefined])).toEqual({
      lookedUp: false,
      handshake: [],
      asked: false,
      answered: false,
    });
  });
});

describe('the address DHCP lent, on the diagram', () => {
  /** TC-626 — drawn under the client, where every other host shows its address. */
  it('is drawn under the DHCP client and nowhere else', () => {
    const css = leasedAddressCss('192.168.1.101');
    expect(css).toContain('[data-id="dhcp-client"] [data-testid="topology-node"]::after');
    expect(css).toContain('content:"192.168.1.101"');
    expect(css.match(/\{/g)).toHaveLength(1);
  });

  it('keeps anything that is not part of an address out of the style', () => {
    const css = leasedAddressCss('1.2.3.4";}body{display:none');
    expect(css).toContain('content:"1.2.3.4";');
    expect(css.match(/\{/g)).toHaveLength(1);
  });
});

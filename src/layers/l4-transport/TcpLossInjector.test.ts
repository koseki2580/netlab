import { describe, expect, it } from 'vitest';
import { DeterministicLossInjector, NullLossInjector } from './TcpLossInjector';

describe('TcpLossInjector', () => {
  it('NullLossInjector never drops segments', () => {
    const injector = new NullLossInjector();

    expect(injector.shouldDropSegment('conn-1', 1000)).toBe(false);
  });

  it('drops a configured sequence number for a connection', () => {
    const injector = new DeterministicLossInjector(new Map([['conn-1', [1000]]]));

    expect(injector.shouldDropSegment('conn-1', 1000)).toBe(true);
  });

  it('does not drop an unconfigured sequence number', () => {
    const injector = new DeterministicLossInjector(new Map([['conn-1', [1000]]]));

    expect(injector.shouldDropSegment('conn-1', 2000)).toBe(false);
  });

  it('does not drop for an unconfigured connection', () => {
    const injector = new DeterministicLossInjector(new Map([['conn-1', [1000]]]));

    expect(injector.shouldDropSegment('conn-2', 1000)).toBe(false);
  });

  it('drops retransmissions repeatedly by default', () => {
    const injector = new DeterministicLossInjector(new Map([['conn-1', [1000]]]));

    expect(injector.shouldDropSegment('conn-1', 1000)).toBe(true);
    expect(injector.shouldDropSegment('conn-1', 1000)).toBe(true);
  });

  it('supports one-shot drops for deterministic demos', () => {
    const injector = new DeterministicLossInjector(new Map([['conn-1', [1000]]]), {
      oneShot: true,
    });

    expect(injector.shouldDropSegment('conn-1', 1000)).toBe(true);
    expect(injector.shouldDropSegment('conn-1', 1000)).toBe(false);
  });

  it('supports multiple drop sequences per connection', () => {
    const injector = new DeterministicLossInjector(new Map([['conn-1', [1000, 3000]]]));

    expect(injector.shouldDropSegment('conn-1', 1000)).toBe(true);
    expect(injector.shouldDropSegment('conn-1', 3000)).toBe(true);
  });

  it('defensively copies configured drop rules', () => {
    const dropSeqs = [1000];
    const injector = new DeterministicLossInjector(new Map([['conn-1', dropSeqs]]));

    dropSeqs.push(2000);

    expect(injector.shouldDropSegment('conn-1', 2000)).toBe(false);
  });
});

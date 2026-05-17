import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps debug silent when debug mode is not enabled', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    logger.debug('hidden');

    expect(debug).not.toHaveBeenCalled();
  });

  it('warn emits through console.warn with the netlab prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('message');

    expect(warn).toHaveBeenCalledWith('[netlab]', 'message');
  });
});

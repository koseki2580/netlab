const isDebug =
  typeof window !== 'undefined' &&
  (window as Window & { __NETLAB_DEBUG__?: boolean }).__NETLAB_DEBUG__ === true;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDebug) console.debug('[netlab]', ...args);
  },
  info: (...args: unknown[]) => console.info('[netlab]', ...args),
  warn: (...args: unknown[]) => console.warn('[netlab]', ...args),
  error: (...args: unknown[]) => console.error('[netlab]', ...args),
};

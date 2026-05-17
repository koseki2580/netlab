import { describe, expect, it } from 'vitest';
import { MONO_FONT_STACK, TEXT } from './tokens';

describe('component style tokens', () => {
  it('keeps text token values mapped to CSS variables', () => {
    expect(MONO_FONT_STACK).toBe('ui-monospace, monospace');
    expect(TEXT).toEqual({
      primary: 'var(--netlab-text-primary)',
      secondary: 'var(--netlab-text-secondary)',
      muted: 'var(--netlab-text-muted)',
      faint: 'var(--netlab-text-faint)',
    });
  });
});

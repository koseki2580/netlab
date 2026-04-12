import { describe, expect, it } from 'vitest';
import { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME, themeToVars } from './index';

describe('themeToVars', () => {
  it('includes node background tokens from the built-in themes', () => {
    expect(NETLAB_DARK_THEME).toMatchObject({
      nodeRouterBg: '#0f2a1a',
      nodeSwitchBg: '#0d1f3c',
      nodeClientBg: '#0d1a2e',
      nodeServerBg: '#0a1f14',
      accentOrange: '#f59e0b',
    });

    expect(NETLAB_LIGHT_THEME).toMatchObject({
      nodeRouterBg: '#f0fdf4',
      nodeSwitchBg: '#eff6ff',
      nodeClientBg: '#f0f9ff',
      nodeServerBg: '#f0fdf4',
      accentOrange: '#f59e0b',
    });

    expect(themeToVars(NETLAB_LIGHT_THEME)).toMatchObject({
      '--netlab-node-router-bg': '#f0fdf4',
      '--netlab-node-switch-bg': '#eff6ff',
      '--netlab-node-client-bg': '#f0f9ff',
      '--netlab-node-server-bg': '#f0fdf4',
      '--netlab-accent-orange': '#f59e0b',
    });
  });
});

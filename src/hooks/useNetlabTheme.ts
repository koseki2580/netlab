import { useContext } from 'react';
import {
  NetlabThemeScopeContext,
  type NetlabThemeScopeValue,
} from '../components/NetlabThemeScope';
import { NetlabError } from '../errors';

/**
 * Returns the resolved theme axes (theme, palette, density, audience,
 * colorMode) from the nearest {@link NetlabThemeScope}. Throws if used
 * outside a scope — callers are expected to render inside `NetlabApp`
 * or another component that mounts `NetlabThemeScope`.
 */
export function useNetlabTheme(): NetlabThemeScopeValue {
  const ctx = useContext(NetlabThemeScopeContext);
  if (!ctx) {
    throw new NetlabError({
      code: 'config/missing-provider',
      message: 'useNetlabTheme must be used inside a NetlabThemeScope',
    });
  }
  return ctx;
}

import type React from 'react';
import { createContext, useMemo, type ReactNode } from 'react';
import {
  NETLAB_DARK_THEME,
  themeToVars,
  type NetlabAudience,
  type NetlabDensity,
  type NetlabPalette,
  type NetlabTheme,
} from '../theme';
import { resolveColorMode, type NetlabColorMode } from '../utils/themeUtils';

export interface NetlabThemeScopeValue {
  theme: NetlabTheme;
  colorMode: NetlabColorMode;
  /** Resolved palette axis. Defaults to `studio`. */
  palette: NetlabPalette;
  /** Resolved density axis. Defaults to `standard`. */
  density: NetlabDensity;
  /** Resolved audience axis. Defaults to `pro`. */
  audience: NetlabAudience;
}

export const NetlabThemeScopeContext = createContext<NetlabThemeScopeValue | null>(null);

export interface NetlabThemeScopeProps {
  theme?: Partial<NetlabTheme>;
  /** Accent flavor — `studio` (default) keeps current accents; `academic` mutes them. */
  palette?: NetlabPalette;
  /** Layout density — drives `--netlab-pad / -gap / -font / -title / -eyebrow`. */
  density?: NetlabDensity;
  /** Audience flag — `learner` shows scaffolding copy, `pro` hides it. */
  audience?: NetlabAudience;
  style?: React.CSSProperties;
  className?: string;
  children: ReactNode;
}

export function NetlabThemeScope({
  theme,
  palette = 'studio',
  density = 'standard',
  audience = 'pro',
  style,
  className,
  children,
}: NetlabThemeScopeProps) {
  const resolvedTheme = useMemo<NetlabTheme>(() => ({ ...NETLAB_DARK_THEME, ...theme }), [theme]);

  const colorMode = useMemo(
    () => resolveColorMode(resolvedTheme.bgPrimary),
    [resolvedTheme.bgPrimary],
  );

  const value = useMemo<NetlabThemeScopeValue>(
    () => ({ theme: resolvedTheme, colorMode, palette, density, audience }),
    [resolvedTheme, colorMode, palette, density, audience],
  );

  return (
    <NetlabThemeScopeContext.Provider value={value}>
      {/* Focus ring CSS injected here so it scopes to netlab subtrees */}
      <style>{`
        .netlab-focus-ring:focus-visible {
          outline: 2px solid var(--netlab-focus-ring, var(--netlab-accent-blue));
          outline-offset: 2px;
        }
      `}</style>
      <div
        data-netlab-palette={palette}
        data-netlab-density={density}
        data-netlab-audience={audience}
        style={{
          ...themeToVars(resolvedTheme, { palette, density }),
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          background: 'var(--netlab-bg-primary)',
          color: 'var(--netlab-text-primary)',
          ...style,
        }}
        className={className}
      >
        {children}
      </div>
    </NetlabThemeScopeContext.Provider>
  );
}

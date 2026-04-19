import type React from 'react';
import { createContext, useMemo, type ReactNode } from 'react';
import { NETLAB_DARK_THEME, themeToVars, type NetlabTheme } from '../theme';
import { resolveColorMode, type NetlabColorMode } from '../utils/themeUtils';

export interface NetlabThemeScopeValue {
  theme: NetlabTheme;
  colorMode: NetlabColorMode;
}

export const NetlabThemeScopeContext = createContext<NetlabThemeScopeValue | null>(null);

export interface NetlabThemeScopeProps {
  theme?: Partial<NetlabTheme>;
  style?: React.CSSProperties;
  className?: string;
  children: ReactNode;
}

export function NetlabThemeScope({ theme, style, className, children }: NetlabThemeScopeProps) {
  const resolvedTheme = useMemo<NetlabTheme>(() => ({ ...NETLAB_DARK_THEME, ...theme }), [theme]);

  const colorMode = useMemo(
    () => resolveColorMode(resolvedTheme.bgPrimary),
    [resolvedTheme.bgPrimary],
  );

  const value = useMemo(() => ({ theme: resolvedTheme, colorMode }), [resolvedTheme, colorMode]);

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
        style={{
          ...themeToVars(resolvedTheme),
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

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette, type CommandPaletteItem } from '../src/components/CommandPalette';
import { KeyboardHelpOverlay } from '../src/components/KeyboardHelpOverlay';
import { NavRail, type NavRailItem, type NavRailView } from '../src/components/NavRail';
import { NetlabThemeScope } from '../src/components/NetlabThemeScope';
import type { NetlabCbSafe, NetlabContrast } from '../src/theme';
import { scenarioRegistry, scenariosInGroup } from '../src/scenarios';
import { installKeymap, type KeymapActions } from '../src/utils/keymap';
import { E2eTraceHook } from './__e2e_hook';
import { ShellChromeProvider } from './ShellChromeContext';

const GITHUB_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const isE2e =
  (import.meta as ImportMeta & { readonly env?: { readonly VITE_E2E?: string } }).env?.VITE_E2E ===
  'true';

const SCENARIO_ROUTES: Record<string, string> = {
  'basic-arp': '/networking/arp',
  'fragmented-echo': '/networking/mtu-fragmentation',
  'tcp-handshake': '/simulation/tcp-handshake',
  'ospf-convergence': '/routing/ospf-convergence',
  'stp-loop': '/networking/stp',
  'nat-basics': '/simulation/nat',
};

/** Read the persisted a11y axes so scenario views honor the gallery's Settings (M6). */
function readPersistedA11yAxes(): { colorBlindSafe: NetlabCbSafe; contrast: NetlabContrast } {
  let colorBlindSafe: NetlabCbSafe = 'off';
  let contrast: NetlabContrast = 'normal';
  try {
    if (window.localStorage.getItem('nl_a11y_cbsafe') === 'on') colorBlindSafe = 'on';
    if (window.localStorage.getItem('nl_a11y_contrast') === 'more') contrast = 'more';
  } catch {
    /* localStorage unavailable — fall back to defaults */
  }
  return { colorBlindSafe, contrast };
}

interface DemoShellProps {
  title: string;
  desc: string;
  children: React.ReactNode;
  embedded?: boolean;
}

export default function DemoShell({ title, desc, children, embedded = false }: DemoShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [registeredActions, setRegisteredActions] = useState<KeymapActions>({});
  const [registeredPaletteItems, setRegisteredPaletteItems] = useState<CommandPaletteItem[]>([]);
  const view: NavRailView = location.pathname === '/' ? 'gallery' : 'simulator';
  const a11yAxes = useMemo(() => readPersistedA11yAxes(), []);

  const openPalette = useCallback(() => {
    setHelpOpen(false);
    setPaletteOpen(true);
  }, []);

  const togglePalette = useCallback(() => {
    setHelpOpen(false);
    setPaletteOpen((value) => !value);
  }, []);

  const openHelp = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(true);
  }, []);

  // R1 — the global `?` key is inert while the pre-flight brief full card owns
  // the screen (it has its own affordances; `B` reopens it per 07 P11). The
  // explicit entry points (StatusLine `? help`, rail Help, palette command)
  // still open the cheat sheet unconditionally.
  const openHelpFromKey = useCallback(() => {
    if (
      typeof document !== 'undefined' &&
      document.querySelector('[data-testid="preflight-fullcard"]')
    ) {
      return;
    }
    openHelp();
  }, [openHelp]);

  const closeShellOverlays = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
  }, []);

  const registerKeymapActions = useCallback((actions: KeymapActions) => {
    setRegisteredActions(actions);
    return () => setRegisteredActions({});
  }, []);

  const registerPaletteItems = useCallback((items: CommandPaletteItem[]) => {
    setRegisteredPaletteItems(items);
    return () => setRegisteredPaletteItems([]);
  }, []);

  const selectView = (nextView: NavRailView) => {
    if (nextView === 'gallery') {
      navigate('/');
    }
  };

  // P4 — caller-controlled nav items. Only views that are actually wired ship
  // here; the rail no longer hardcodes disabled "not wired yet" placeholders.
  const navItems: NavRailItem[] = [
    {
      id: 'gallery',
      label: 'Browse',
      icon: '⊞',
      active: view === 'gallery',
      onClick: () => selectView('gallery'),
    },
    {
      id: 'simulator',
      label: 'Run',
      icon: '▶',
      active: view === 'simulator',
      onClick: () => selectView('simulator'),
    },
  ];

  const commandItems = useMemo<CommandPaletteItem[]>(() => {
    const scenarioItems = scenarioRegistry
      .list()
      .map((scenario): CommandPaletteItem | null => {
        const path = SCENARIO_ROUTES[scenario.metadata.id];
        if (!path) return null;
        return {
          id: `scenario:${scenario.metadata.id}`,
          label: scenario.metadata.title,
          subtitle: scenario.metadata.summary,
          group: 'Scenarios',
          keywords: [
            scenario.metadata.id,
            ...scenario.metadata.protocols,
            scenario.metadata.difficulty,
          ],
          onSelect: () => {
            void navigate(path);
          },
        };
      })
      .filter((item): item is CommandPaletteItem => item !== null);

    // M4 — "compare with <sibling>" for the scenario on the current route.
    const currentScenarioId = Object.keys(SCENARIO_ROUTES).find(
      (id) => SCENARIO_ROUTES[id] === location.pathname,
    );
    const currentGroup = currentScenarioId
      ? scenarioRegistry.get(currentScenarioId)?.topologyGroup
      : undefined;
    const compareItems: CommandPaletteItem[] = currentGroup
      ? scenariosInGroup(currentGroup)
          .filter((sibling) => sibling.metadata.id !== currentScenarioId)
          .map((sibling) => ({
            id: `compare:${currentScenarioId}:${sibling.metadata.id}`,
            label: `Compare with ${sibling.metadata.title}`,
            subtitle: 'Open both scenarios side by side',
            group: 'Commands',
            keywords: ['compare', sibling.metadata.id, ...sibling.metadata.protocols],
            onSelect: () => {
              void navigate(`/compare/${currentScenarioId}/${sibling.metadata.id}`);
            },
          }))
      : [];

    return [
      ...scenarioItems,
      ...compareItems,
      ...registeredPaletteItems,
      {
        id: 'command:gallery',
        label: 'Open Gallery',
        subtitle: 'Return to the demo gallery',
        group: 'Commands',
        keywords: ['browse', 'home'],
        onSelect: () => {
          void navigate('/');
        },
      },
      {
        id: 'command:help',
        label: 'Show keyboard shortcuts',
        subtitle: 'Open the shell help popover',
        group: 'Commands',
        keywords: ['help', 'shortcuts', '?'],
        onSelect: openHelp,
      },
    ];
  }, [navigate, openHelp, registeredPaletteItems, location.pathname]);

  useEffect(() => {
    if (embedded) return undefined;
    return installKeymap({
      togglePalette,
      openHelp: openHelpFromKey,
      closeOverlays: closeShellOverlays,
      ...registeredActions,
    });
  }, [closeShellOverlays, embedded, openHelpFromKey, registeredActions, togglePalette]);

  const shellChrome = useMemo(
    () => ({
      openPalette,
      togglePalette,
      openHelp,
      closeShellOverlays,
      registerKeymapActions,
      registerPaletteItems,
    }),
    [
      closeShellOverlays,
      openHelp,
      openPalette,
      registerKeymapActions,
      registerPaletteItems,
      togglePalette,
    ],
  );

  return (
    <div
      data-testid="netlab-root"
      data-netlab-sim-shell
      className="netlab-sim-shell"
      style={{ display: 'flex', height: '100vh', background: '#0f172a' }}
    >
      {!embedded && (
        <NavRail items={navItems} onOpenBrand={() => selectView('gallery')} onOpenHelp={openHelp} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {!embedded && (
          <div
            style={{
              padding: '10px 16px',
              background: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: '#e2e8f0',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                fontSize: 15,
              }}
            >
              📡 netlab
            </span>
            <span
              style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}
            >
              {title}
            </span>
            <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{desc}</span>
            <a
              href="https://github.com/koseki2580/netlab"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#94a3b8',
                textDecoration: 'none',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
              onMouseEnter={(event) => {
                (event.currentTarget as HTMLAnchorElement).style.color = '#94a3b8';
              }}
              onMouseLeave={(event) => {
                (event.currentTarget as HTMLAnchorElement).style.color = '#94a3b8';
              }}
            >
              {GITHUB_ICON}
              GitHub
            </a>
          </div>
        )}
        <NetlabThemeScope
          colorBlindSafe={a11yAxes.colorBlindSafe}
          contrast={a11yAxes.contrast}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          {isE2e && <E2eTraceHook />}
          <ShellChromeProvider value={shellChrome}>{children}</ShellChromeProvider>
          {!embedded && (
            <>
              <CommandPalette
                open={paletteOpen}
                items={commandItems}
                onClose={() => setPaletteOpen(false)}
              />
              <KeyboardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
            </>
          )}
        </NetlabThemeScope>
      </div>
    </div>
  );
}

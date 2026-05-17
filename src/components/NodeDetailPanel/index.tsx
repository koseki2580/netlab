import { memo, useContext, useEffect, useRef } from 'react';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import type { LinkQosConfig } from '../../types/link';
import type { NetlabNode, TopologySnapshot } from '../../types/topology';
import { useNetlabContext } from '../NetlabContext';
import { NetlabThemeScopeContext } from '../NetlabThemeScope';
import { useNetlabUI } from '../NetlabUIContext';
import { explainerFor, type LearnerNodeKind } from './learnerExplainers';
import { vlanColor } from './_colors';
import { ROW_STYLE, SECTION_HEADER_STYLE } from './_styles';
import { EdgeDetail } from './sections/EdgeDetail';
import { HostDetail } from './sections/HostDetail';
import { HostEditorSection } from './sections/HostEditorSection';
import { RouterDetail } from './sections/RouterDetail';
import { RouterEditorSection } from './sections/RouterEditorSection';
import { SwitchDetail } from './sections/SwitchDetail';
import { SwitchEditorSection } from './sections/SwitchEditorSection';
import {
  DhcpLeaseDetail,
  DnsCacheDetail,
  JoinedGroupsDetail,
  MulticastMembershipDetail,
  MulticastSnoopingDetail,
  UdpBindingsDetail,
} from './sections/services';
import {
  DP_NARROW_BREAKPOINT,
  resolveDpTab,
  useNodeDetailDock,
  type DpMode,
  type DpTab,
} from './useNodeDetailDock';

export { vlanColor };

export interface NodeDetailPanelProps {
  editable?: boolean;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}

const TAB_LABELS: Record<DpTab, string> = {
  overview: 'Overview',
  ifaces: 'Interfaces',
  routes: 'Routes',
  arp: 'ARP / Services',
  acl: 'ACL',
  sandbox: 'Sandbox',
};

type NodeRole = 'router' | 'switch' | 'client' | 'server' | string;

interface ResolvedTarget {
  kind: 'node' | 'edge';
  role?: NodeRole;
}

function getVisibleTabs(target: ResolvedTarget, canEdit: boolean): DpTab[] {
  if (target.kind === 'edge') return ['overview'];
  const role = target.role;
  const tabs: DpTab[] = ['overview'];
  if (role === 'router' || role === 'switch' || role === 'client' || role === 'server') {
    if (role === 'router' || role === 'switch') tabs.push('ifaces');
  }
  if (role === 'router') tabs.push('routes');
  if (role === 'router' || role === 'switch') tabs.push('arp');
  if (role === 'router') tabs.push('acl');
  if (
    canEdit &&
    (role === 'router' || role === 'switch' || role === 'client' || role === 'server')
  ) {
    tabs.push('sandbox');
  }
  return tabs;
}

function getDefaultTab(target: ResolvedTarget): DpTab {
  if (target.kind === 'edge') return 'overview';
  if (target.role === 'router' || target.role === 'switch') return 'ifaces';
  return 'overview';
}

interface ResizeHandleProps {
  currentWidth: number;
  onResize: (next: number) => void;
}

function ResizeHandle({ currentWidth, onResize }: ResizeHandleProps): JSX.Element {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(currentWidth);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = startWRef.current + (startXRef.current - event.clientX);
      onResize(next);
    };
    const up = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [onResize]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    startXRef.current = event.clientX;
    startWRef.current = currentWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      data-netlab-dp-resize-handle
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: -3,
        top: 0,
        bottom: 0,
        width: 6,
        cursor: 'col-resize',
        zIndex: 30,
        background: 'transparent',
      }}
    />
  );
}

interface TabNavProps {
  tabs: readonly DpTab[];
  activeTab: DpTab;
  orientation: 'row' | 'column';
  onSelect: (tab: DpTab) => void;
}

function TabNav({ tabs, activeTab, orientation, onSelect }: TabNavProps): JSX.Element {
  const isColumn = orientation === 'column';
  return (
    <nav
      data-netlab-dp-nav
      data-dp-nav-orientation={orientation}
      style={{
        display: 'flex',
        flexDirection: isColumn ? 'column' : 'row',
        gap: 2,
        padding: isColumn ? '10px 8px' : '8px 10px',
        ...(isColumn
          ? {
              width: 140,
              borderRight: '1px solid var(--netlab-border-subtle)',
              overflowY: 'auto',
              flexShrink: 0,
            }
          : {
              width: '100%',
              borderBottom: '1px solid var(--netlab-border-subtle)',
              overflowX: 'auto',
            }),
        background: 'color-mix(in srgb, var(--netlab-bg-surface) 65%, var(--netlab-bg-panel))',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            data-netlab-dp-tab={tab}
            data-active={isActive ? 'true' : 'false'}
            aria-pressed={isActive}
            onClick={() => onSelect(tab)}
            style={{
              background: isActive ? 'var(--netlab-bg-elevated)' : 'transparent',
              color: isActive ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
              border: 'none',
              borderLeft: isColumn
                ? `2px solid ${isActive ? 'var(--netlab-accent-cyan)' : 'transparent'}`
                : 'none',
              borderBottom: isColumn
                ? 'none'
                : `2px solid ${isActive ? 'var(--netlab-accent-cyan)' : 'transparent'}`,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 600,
              padding: isColumn ? '6px 10px' : '6px 12px',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              letterSpacing: 0.3,
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </nav>
  );
}

export const NodeDetailPanel = memo(function NodeDetailPanel({
  editable = false,
  onTopologyChange,
}: NodeDetailPanelProps = {}) {
  const { selectedNodeId, setSelectedNodeId, selectedEdgeId, setSelectedEdgeId } = useNetlabUI();
  const { topology } = useNetlabContext();
  const simCtx = useContext(SimulationContext);
  const themeScope = useContext(NetlabThemeScopeContext);
  const audience = themeScope?.audience ?? 'pro';
  const dock = useNodeDetailDock();
  const activeSelectionId = selectedEdgeId ?? selectedNodeId;
  const canEdit = editable && onTopologyChange !== undefined;

  useEffect(() => {
    if (!activeSelectionId) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId?.(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSelectionId, setSelectedEdgeId, setSelectedNodeId]);

  if (!selectedNodeId && !selectedEdgeId) return null;

  const closePanel = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId?.(null);
  };

  const updateSnapshot = (update: (snapshot: TopologySnapshot) => TopologySnapshot) => {
    if (!onTopologyChange) return;
    onTopologyChange(
      update({
        nodes: topology.nodes,
        edges: topology.edges,
        areas: topology.areas,
      }),
    );
  };

  // Resolve the selected target.
  let target: ResolvedTarget;
  let titleNode: React.ReactNode;
  let ariaLabel: string;
  let headerEyebrow: string;
  let edge: NetworkTopologyEdge | undefined;
  let node: NetlabNode | undefined;
  if (selectedEdgeId) {
    edge = topology.edges.find((candidate) => candidate.id === selectedEdgeId);
    if (!edge) return null;
    target = { kind: 'edge' };
    titleNode = (
      <>
        {edge.id}
        <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>link</span>
      </>
    );
    ariaLabel = `Edge detail · ${edge.id}`;
    headerEyebrow = 'EDGE DETAIL';
  } else {
    node = topology.nodes.find((candidate) => candidate.id === selectedNodeId);
    if (!node || !selectedNodeId) return null;
    target = { kind: 'node', role: node.data.role };
    titleNode = (
      <>
        {node.data.label}
        <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>{node.data.role}</span>
        <span style={{ color: 'var(--netlab-text-faint)', marginLeft: 8 }}>
          {node.data.layerId}
        </span>
      </>
    );
    ariaLabel = `Node detail · ${node.data.label}`;
    headerEyebrow = 'NODE DETAIL';
  }

  const visibleTabs = getVisibleTabs(target, canEdit);
  const defaultTab = getDefaultTab(target);
  const activeTab = resolveDpTab(dock.persistedTab, visibleTabs, defaultTab);

  // Narrow-mode breakpoint determines tab-nav orientation.
  const orientation: 'row' | 'column' = dock.width < DP_NARROW_BREAKPOINT ? 'row' : 'column';

  // Shell style — overlay mode floats; pinned mode reflows as a flex sibling.
  const isOverlay = dock.mode === 'overlay';
  const panelStyle: React.CSSProperties = {
    width: `${dock.width}px`,
    height: '100%',
    background: isOverlay
      ? 'color-mix(in srgb, var(--netlab-bg-panel) 96%, transparent)'
      : 'var(--netlab-bg-panel)',
    color: 'var(--netlab-text-primary)',
    fontFamily: 'monospace',
    fontSize: 11,
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid var(--netlab-border-subtle)',
    pointerEvents: 'all',
    ...(isOverlay
      ? {
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 20,
          boxShadow: '-16px 0 40px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }
      : {
          position: 'relative',
          flexShrink: 0,
        }),
  };

  // Learner explainer (rendered above the tab nav so it stays visible across tabs).
  let learnerCopy: string | undefined;
  let learnerKind: LearnerNodeKind | null = null;
  if (target.kind === 'node' && node) {
    const role = node.data.role;
    learnerKind =
      role === 'router'
        ? 'router'
        : role === 'switch'
          ? 'switch'
          : role === 'client' || role === 'server'
            ? 'host'
            : null;
    if (audience === 'learner') learnerCopy = explainerFor(learnerKind, 'overview');
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel}
      tabIndex={0}
      className="netlab-dp-slide-in"
      data-netlab-dp
      data-dp-mode={dock.mode}
      data-dp-width={dock.width}
      style={panelStyle}
    >
      <ResizeHandle currentWidth={dock.width} onResize={dock.setWidth} />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--netlab-border-subtle)',
          background: 'color-mix(in srgb, var(--netlab-bg-surface) 50%, var(--netlab-bg-panel))',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 'bold',
              color: 'var(--netlab-text-secondary)',
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            {headerEyebrow}
          </div>
          <div
            style={{
              color: 'var(--netlab-text-primary)',
              fontWeight: 'bold',
              fontSize: 13,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {titleNode}
          </div>
        </div>
        {target.kind === 'node' && (
          <button
            type="button"
            data-netlab-dp-mode-toggle
            aria-pressed={dock.mode === 'pinned'}
            title={dock.mode === 'overlay' ? 'Pin panel (push canvas)' : 'Unpin (overlay canvas)'}
            onClick={() => dock.setMode(dock.mode === 'overlay' ? 'pinned' : 'overlay')}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 600,
              color:
                dock.mode === 'pinned' ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-muted)',
              background:
                dock.mode === 'pinned'
                  ? 'color-mix(in srgb, var(--netlab-accent-cyan) 12%, transparent)'
                  : 'transparent',
              border: '1px solid var(--netlab-border-subtle)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            {dock.mode === 'pinned' ? '⇤ Pinned' : '⇥ Pin'}
          </button>
        )}
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close panel"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--netlab-text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </header>

      {learnerCopy && (
        <div
          data-learner-explainer={learnerKind ?? ''}
          style={{
            margin: '8px 12px 0',
            padding: '8px 10px',
            borderRadius: 6,
            background:
              'color-mix(in srgb, var(--netlab-accent-cyan) 10%, var(--netlab-bg-elevated))',
            border:
              '1px solid color-mix(in srgb, var(--netlab-accent-cyan) 22%, var(--netlab-border-subtle))',
            color: 'var(--netlab-text-secondary)',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <span style={{ marginRight: 6 }} aria-hidden="true">
            💡
          </span>
          {learnerCopy}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: orientation === 'column' ? 'row' : 'column',
        }}
      >
        <TabNav
          tabs={visibleTabs}
          activeTab={activeTab}
          orientation={orientation}
          onSelect={dock.setTab}
        />
        <div
          data-netlab-dp-content
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: 'auto',
            padding: '10px 14px',
          }}
        >
          {target.kind === 'edge' && edge ? (
            <EdgeContent
              edge={edge}
              topology={topology}
              onTopologyChange={onTopologyChange}
              updateSnapshot={updateSnapshot}
            />
          ) : node && selectedNodeId ? (
            <NodeContent
              activeTab={activeTab}
              node={node}
              nodeId={selectedNodeId}
              canEdit={canEdit}
              hasTopologyWriter={onTopologyChange !== undefined}
              topology={topology}
              updateSnapshot={updateSnapshot}
              simCtx={simCtx}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
});

interface NodeContentProps {
  activeTab: DpTab;
  node: NetlabNode;
  nodeId: string;
  canEdit: boolean;
  topology: ReturnType<typeof useNetlabContext>['topology'];
  updateSnapshot: (update: (snapshot: TopologySnapshot) => TopologySnapshot) => void;
  simCtx: SimulationContextValue | null;
}

function NodeContent({
  activeTab,
  node,
  nodeId,
  canEdit,
  topology,
  updateSnapshot,
  simCtx,
}: NodeContentProps): JSX.Element | null {
  const d = node.data;
  const role = d.role;
  const leaseState = simCtx?.getDhcpLeaseState(nodeId) ?? null;
  const dnsCache = simCtx?.getDnsCache(nodeId) ?? null;
  const udpBindings = simCtx?.engine.getUdpBindings(nodeId) ?? null;
  const runtimeIp = simCtx?.engine.getRuntimeNodeIp(nodeId) ?? leaseState?.assignedIp ?? undefined;
  const multicastTableSnapshot =
    role === 'switch' ? (simCtx?.engine.getMulticastTableSnapshot(nodeId) ?? []) : [];
  const igmpMemberships =
    role === 'router' ? (simCtx?.engine.getIgmpMembershipSnapshot(nodeId) ?? []) : [];
  const joinedGroups =
    role === 'client' || role === 'server' ? (simCtx?.engine.getJoinedGroups(nodeId) ?? []) : [];

  const snapshot: TopologySnapshot = {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  };

  const updateSelectedNode = (updater: (candidate: NetlabNode) => NetlabNode) => {
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.map((candidate) =>
        candidate.id === nodeId ? updater(candidate) : candidate,
      ),
    }));
  };

  if (activeTab === 'overview') {
    return (
      <>
        {d.wifi && (
          <>
            <div style={SECTION_HEADER_STYLE}>WIRELESS</div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Role</span>
              <span style={{ color: 'var(--netlab-accent-green)' }}>{d.wifi.role}</span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>SSID</span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>{d.wifi.ssid}</span>
            </div>
            {d.wifi.apId && (
              <div style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>AP</span>
                <span style={{ color: 'var(--netlab-text-primary)' }}>{d.wifi.apId}</span>
              </div>
            )}
          </>
        )}
        {(d.vrfs?.length ?? 0) > 0 && (
          <>
            <div style={SECTION_HEADER_STYLE}>MPLS VRF</div>
            {d.vrfs?.map((vrf) => (
              <div key={vrf.name} style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>
                  {vrf.name}
                </span>
                <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                  RD {vrf.rd.value} / RT {vrf.importRts.map((rt) => rt.value).join(', ')}
                </span>
              </div>
            ))}
          </>
        )}
        {d.vtep && (
          <>
            <div style={SECTION_HEADER_STYLE}>VXLAN VTEP</div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>VNI</span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>{d.vtep.vni}</span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>VTEP</span>
              <span style={{ color: 'var(--netlab-text-primary)' }}>{d.vtep.sourceVtepIp}</span>
            </div>
          </>
        )}
        {(role === 'client' || role === 'server') && (
          <>
            <HostDetail data={d} {...(runtimeIp !== undefined ? { runtimeIp } : {})} />
            {leaseState && <DhcpLeaseDetail lease={leaseState} />}
            {dnsCache && <DnsCacheDetail cache={dnsCache} />}
            {udpBindings && <UdpBindingsDetail bindings={udpBindings} />}
            {simCtx && <JoinedGroupsDetail groups={joinedGroups} />}
          </>
        )}
      </>
    );
  }

  if (activeTab === 'ifaces') {
    if (role === 'router') {
      return (
        <>
          <RouterDetail
            data={d}
            {...(updateSnapshot && (canEdit || activeTab === 'ifaces')
              ? {
                  onInterfaceMtuChange: (interfaceId: string, mtu: number | undefined) => {
                    updateSnapshot((snap) => ({
                      ...snap,
                      nodes: snap.nodes.map((candidate) =>
                        candidate.id === nodeId && candidate.data.role === 'router'
                          ? {
                              ...candidate,
                              data: {
                                ...candidate.data,
                                interfaces: (candidate.data.interfaces ?? []).map((iface) => {
                                  if (iface.id !== interfaceId) return iface;
                                  const { mtu: _mtu, ...restIface } = iface;
                                  return mtu === undefined ? restIface : { ...restIface, mtu };
                                }),
                              },
                            }
                          : candidate,
                      ),
                    }));
                  },
                  onSubInterfaceMtuChange: (
                    interfaceId: string,
                    subInterfaceId: string,
                    mtu: number | undefined,
                  ) => {
                    updateSnapshot((snap) => ({
                      ...snap,
                      nodes: snap.nodes.map((candidate) =>
                        candidate.id === nodeId && candidate.data.role === 'router'
                          ? {
                              ...candidate,
                              data: {
                                ...candidate.data,
                                interfaces: (candidate.data.interfaces ?? []).map((iface) =>
                                  iface.id === interfaceId
                                    ? {
                                        ...iface,
                                        subInterfaces: (iface.subInterfaces ?? []).map(
                                          (subInterface) => {
                                            if (subInterface.id !== subInterfaceId) {
                                              return subInterface;
                                            }
                                            const { mtu: _mtu, ...restSubInterface } = subInterface;
                                            return mtu === undefined
                                              ? restSubInterface
                                              : { ...restSubInterface, mtu };
                                          },
                                        ),
                                      }
                                    : iface,
                                ),
                              },
                            }
                          : candidate,
                      ),
                    }));
                  },
                }
              : {})}
          />
          {simCtx && role === 'router' && (
            <MulticastMembershipDetail memberships={igmpMemberships} />
          )}
        </>
      );
    }
    if (role === 'switch') {
      return <SwitchDetail nodeId={nodeId} data={d} topology={topology} />;
    }
    return null;
  }

  if (activeTab === 'routes') {
    const staticRoutes = d.staticRoutes ?? [];
    if (staticRoutes.length === 0) {
      return <div style={{ color: 'var(--netlab-text-muted)' }}>No static routes configured.</div>;
    }
    return (
      <>
        <div style={SECTION_HEADER_STYLE}>STATIC ROUTES</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ color: 'var(--netlab-text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '4px 6px', fontWeight: 600 }}>Destination</th>
              <th style={{ padding: '4px 6px', fontWeight: 600 }}>Next hop</th>
              <th style={{ padding: '4px 6px', fontWeight: 600 }}>Metric</th>
            </tr>
          </thead>
          <tbody>
            {staticRoutes.map((route, index) => (
              <tr
                key={`${route.destination}-${index}`}
                style={{ borderTop: '1px solid var(--netlab-border-subtle)' }}
              >
                <td style={{ padding: '4px 6px', color: 'var(--netlab-accent-cyan)' }}>
                  {route.destination}
                </td>
                <td style={{ padding: '4px 6px', color: 'var(--netlab-text-primary)' }}>
                  {route.nextHop ?? '—'}
                </td>
                <td style={{ padding: '4px 6px', color: 'var(--netlab-text-muted)' }}>
                  {route.metric ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (activeTab === 'arp') {
    if (role === 'switch') {
      return simCtx ? (
        <MulticastSnoopingDetail entries={multicastTableSnapshot} />
      ) : (
        <div style={{ color: 'var(--netlab-text-muted)' }}>No simulation runtime attached.</div>
      );
    }
    if (role === 'router') {
      const hasAny =
        Boolean(leaseState) ||
        Boolean(dnsCache) ||
        Boolean(udpBindings) ||
        igmpMemberships.length > 0;
      if (!hasAny) {
        return (
          <div style={{ color: 'var(--netlab-text-muted)' }}>
            No ARP, DHCP, DNS, or UDP state observed for this router yet.
          </div>
        );
      }
      return (
        <>
          {leaseState && <DhcpLeaseDetail lease={leaseState} />}
          {dnsCache && <DnsCacheDetail cache={dnsCache} />}
          {udpBindings && <UdpBindingsDetail bindings={udpBindings} />}
        </>
      );
    }
    return null;
  }

  if (activeTab === 'acl') {
    return (
      <div style={{ color: 'var(--netlab-text-muted)' }}>
        ACL inspection is not yet wired to runtime state.
      </div>
    );
  }

  if (activeTab === 'sandbox') {
    if (!canEdit) {
      return (
        <div style={{ color: 'var(--netlab-text-muted)' }}>
          Sandbox edits are disabled for this view.
        </div>
      );
    }
    if (role === 'router') {
      return (
        <RouterEditorSection
          nodeId={nodeId}
          data={d}
          editable={canEdit}
          snapshot={snapshot}
          updateNode={updateSelectedNode}
        />
      );
    }
    if (role === 'switch') {
      return <SwitchEditorSection data={d} editable={canEdit} updateNode={updateSelectedNode} />;
    }
    if (role === 'client' || role === 'server') {
      return (
        <HostEditorSection
          nodeId={nodeId}
          data={d}
          editable={canEdit}
          snapshot={snapshot}
          updateNode={updateSelectedNode}
        />
      );
    }
    return null;
  }

  return null;
}

type NetworkTopologyEdge = ReturnType<typeof useNetlabContext>['topology']['edges'][number];

interface EdgeContentProps {
  edge: NetworkTopologyEdge;
  topology: ReturnType<typeof useNetlabContext>['topology'];
  onTopologyChange: ((topology: TopologySnapshot) => void) | undefined;
  updateSnapshot: (update: (snapshot: TopologySnapshot) => TopologySnapshot) => void;
}

function EdgeContent({
  edge,
  topology,
  onTopologyChange,
  updateSnapshot,
}: EdgeContentProps): JSX.Element {
  return (
    <EdgeDetail
      edge={edge}
      topology={topology}
      {...(onTopologyChange
        ? {
            onMtuChange: (mtu: number | undefined) => {
              updateSnapshot((snapshot) => ({
                ...snapshot,
                edges: snapshot.edges.map((candidate) => {
                  if (candidate.id !== edge.id) return candidate;
                  const { data: _data, ...restCandidate } = candidate;
                  return mtu === undefined
                    ? restCandidate
                    : {
                        ...restCandidate,
                        data: { ...(candidate.data ?? {}), mtuBytes: mtu },
                      };
                }),
              }));
            },
          }
        : {})}
      {...(onTopologyChange
        ? {
            onQosChange: (link: LinkQosConfig) => {
              updateSnapshot((snapshot) => ({
                ...snapshot,
                edges: snapshot.edges.map((candidate) =>
                  candidate.id === edge.id
                    ? {
                        ...candidate,
                        data: { ...(candidate.data ?? {}), link },
                      }
                    : candidate,
                ),
              }));
            },
          }
        : {})}
    />
  );
}

export type { DpMode };

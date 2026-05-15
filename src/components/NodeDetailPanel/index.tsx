import { memo, useContext, useEffect } from 'react';
import { SimulationContext } from '../../simulation/SimulationContext';
import type { LinkQosConfig } from '../../types/link';
import type { NetlabNode, TopologySnapshot } from '../../types/topology';
import { useNetlabContext } from '../NetlabContext';
import { NetlabThemeScopeContext } from '../NetlabThemeScope';
import { useNetlabUI } from '../NetlabUIContext';
import { explainerFor, type LearnerNodeKind } from './learnerExplainers';
import { vlanColor } from './_colors';
import { PANEL_STYLE, ROW_STYLE, SECTION_HEADER_STYLE } from './_styles';
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

export { vlanColor };

export interface NodeDetailPanelProps {
  editable?: boolean;
  onTopologyChange?: (topology: TopologySnapshot) => void;
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
  const activeSelectionId = selectedEdgeId ?? selectedNodeId;
  const canEdit = editable && onTopologyChange !== undefined;

  useEffect(() => {
    if (!activeSelectionId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId?.(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSelectionId, selectedNodeId, setSelectedEdgeId, setSelectedNodeId]);

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

  if (selectedEdgeId) {
    const edge = topology.edges.find((candidate) => candidate.id === selectedEdgeId);
    if (!edge) return null;

    return (
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Edge detail · ${edge.id}`}
        tabIndex={0}
        className="netlab-dp-slide-in"
        style={PANEL_STYLE}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              color: 'var(--netlab-text-secondary)',
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            EDGE DETAIL
          </div>
          <button
            onClick={closePanel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--netlab-text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 2px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              color: 'var(--netlab-text-primary)',
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            {edge.id}
          </span>
          <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>link</span>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--netlab-border-subtle)',
            paddingTop: 8,
          }}
        >
          <EdgeDetail
            edge={edge}
            topology={topology}
            {...(onTopologyChange
              ? {
                  onMtuChange: (mtu: number | undefined) => {
                    updateSnapshot((snapshot) => ({
                      ...snapshot,
                      edges: snapshot.edges.map((candidate) => {
                        if (candidate.id !== edge.id) {
                          return candidate;
                        }
                        const { data: _data, ...restCandidate } = candidate;
                        return mtu === undefined
                          ? restCandidate
                          : {
                              ...restCandidate,
                              data: {
                                ...(candidate.data ?? {}),
                                mtuBytes: mtu,
                              },
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
                              data: {
                                ...(candidate.data ?? {}),
                                link,
                              },
                            }
                          : candidate,
                      ),
                    }));
                  },
                }
              : {})}
          />
        </div>
      </div>
    );
  }

  const node = topology.nodes.find((n) => n.id === selectedNodeId);
  if (!node || !selectedNodeId) return null;

  const snapshot: TopologySnapshot = {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  };

  const updateSelectedNode = (updater: (candidate: NetlabNode) => NetlabNode) => {
    updateSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      nodes: currentSnapshot.nodes.map((candidate) =>
        candidate.id === selectedNodeId ? updater(candidate) : candidate,
      ),
    }));
  };

  const d = node.data;
  const leaseState = simCtx?.getDhcpLeaseState(selectedNodeId) ?? null;
  const dnsCache = simCtx?.getDnsCache(selectedNodeId) ?? null;
  const udpBindings = simCtx?.engine.getUdpBindings(selectedNodeId) ?? null;
  const runtimeIp =
    simCtx?.engine.getRuntimeNodeIp(selectedNodeId) ?? leaseState?.assignedIp ?? undefined;
  const multicastTableSnapshot =
    d.role === 'switch' ? (simCtx?.engine.getMulticastTableSnapshot(selectedNodeId) ?? []) : [];
  const igmpMemberships =
    d.role === 'router' ? (simCtx?.engine.getIgmpMembershipSnapshot(selectedNodeId) ?? []) : [];
  const joinedGroups =
    d.role === 'client' || d.role === 'server'
      ? (simCtx?.engine.getJoinedGroups(selectedNodeId) ?? [])
      : [];

  const learnerKind: LearnerNodeKind | null =
    d.role === 'router'
      ? 'router'
      : d.role === 'switch'
        ? 'switch'
        : d.role === 'client' || d.role === 'server'
          ? 'host'
          : null;
  const learnerCopy = audience === 'learner' ? explainerFor(learnerKind, 'overview') : undefined;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Node detail · ${d.label}`}
      tabIndex={0}
      className="netlab-dp-slide-in"
      style={PANEL_STYLE}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            color: 'var(--netlab-text-secondary)',
            fontSize: 10,
            letterSpacing: 1,
          }}
        >
          NODE DETAIL
        </div>
        <button
          onClick={closePanel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--netlab-text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            color: 'var(--netlab-text-primary)',
            fontWeight: 'bold',
            fontSize: 13,
          }}
        >
          {d.label}
        </span>
        <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>{d.role}</span>
        <span style={{ color: 'var(--netlab-text-faint)', marginLeft: 8 }}>{d.layerId}</span>
      </div>
      {learnerCopy && (
        <div
          data-learner-explainer={learnerKind ?? ''}
          style={{
            marginBottom: 8,
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
          borderTop: '1px solid var(--netlab-border-subtle)',
          paddingTop: 8,
        }}
      >
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
        {d.role === 'router' && (
          <RouterDetail
            data={d}
            {...(onTopologyChange
              ? {
                  onInterfaceMtuChange: (interfaceId: string, mtu: number | undefined) => {
                    updateSnapshot((snapshot) => ({
                      ...snapshot,
                      nodes: snapshot.nodes.map((candidate) =>
                        candidate.id === selectedNodeId && candidate.data.role === 'router'
                          ? {
                              ...candidate,
                              data: {
                                ...candidate.data,
                                interfaces: (candidate.data.interfaces ?? []).map((iface) => {
                                  if (iface.id !== interfaceId) {
                                    return iface;
                                  }
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
                    updateSnapshot((snapshot) => ({
                      ...snapshot,
                      nodes: snapshot.nodes.map((candidate) =>
                        candidate.id === selectedNodeId && candidate.data.role === 'router'
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
        )}
        {d.role === 'switch' && <SwitchDetail nodeId={node.id} data={d} topology={topology} />}
        {(d.role === 'client' || d.role === 'server') && (
          <HostDetail data={d} {...(runtimeIp !== undefined ? { runtimeIp } : {})} />
        )}
        {canEdit && (d.role === 'client' || d.role === 'server') && (
          <HostEditorSection
            nodeId={node.id}
            data={d}
            editable={canEdit}
            snapshot={snapshot}
            updateNode={updateSelectedNode}
          />
        )}
        {canEdit && d.role === 'router' && (
          <RouterEditorSection
            nodeId={node.id}
            data={d}
            editable={canEdit}
            snapshot={snapshot}
            updateNode={updateSelectedNode}
          />
        )}
        {canEdit && d.role === 'switch' && (
          <SwitchEditorSection data={d} editable={canEdit} updateNode={updateSelectedNode} />
        )}
        {leaseState && <DhcpLeaseDetail lease={leaseState} />}
        {dnsCache && <DnsCacheDetail cache={dnsCache} />}
        {udpBindings && <UdpBindingsDetail bindings={udpBindings} />}
        {d.role === 'switch' && simCtx && (
          <MulticastSnoopingDetail entries={multicastTableSnapshot} />
        )}
        {d.role === 'router' && simCtx && (
          <MulticastMembershipDetail memberships={igmpMemberships} />
        )}
        {(d.role === 'client' || d.role === 'server') && simCtx && (
          <JoinedGroupsDetail groups={joinedGroups} />
        )}
      </div>
    </div>
  );
});

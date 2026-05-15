import type { NetlabNode, NetlabNodeData, TopologySnapshot } from '../../../types/topology';
import {
  validateCidr,
  validateIpAddress,
  validateMacAddress,
  validateNoDuplicateIp,
  validatePrefixLength,
} from '../../../utils/networkValidators';
import { EditableSelectRow, EditableTextRow } from '../_atoms';
import { collectConfiguredIps, validatePositiveInteger } from '../_parsers';
import { SECTION_HEADER_STYLE } from '../_styles';

export function RouterEditorSection({
  nodeId,
  data,
  editable,
  snapshot,
  updateNode,
}: {
  nodeId: string;
  data: NetlabNodeData;
  editable: boolean;
  snapshot: TopologySnapshot;
  updateNode: (updater: (node: NetlabNode) => NetlabNode) => void;
}) {
  const interfaces = data.interfaces ?? [];
  const staticRoutes = data.staticRoutes ?? [];
  const dhcpServer = data.dhcpServer;
  const dnsServer = data.dnsServer;

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>EDIT INTERFACES</div>
      {interfaces.map((iface) => (
        <div key={`${iface.id}-edit`} style={{ marginBottom: 10 }}>
          <div style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold', marginBottom: 4 }}>
            {iface.name}
          </div>
          <EditableTextRow
            label="IP"
            name={`interface-ip-${iface.id}`}
            value={iface.ipAddress}
            editable={editable}
            color="var(--netlab-accent-cyan)"
            minWidth={36}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error =
                validateIpAddress(trimmed) ??
                validateNoDuplicateIp(
                  trimmed,
                  collectConfiguredIps(snapshot, {
                    nodeId,
                    interfaceId: iface.id,
                  }),
                );
              if (error) {
                return error;
              }
              if (trimmed === iface.ipAddress) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) =>
                    candidate.id === iface.id ? { ...candidate, ipAddress: trimmed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="Prefix"
            name={`interface-prefix-${iface.id}`}
            value={String(iface.prefixLength)}
            editable={editable}
            minWidth={36}
            onCommit={(nextValue) => {
              const parsed = Number.parseInt(nextValue.trim(), 10);
              const error = validatePrefixLength(parsed);
              if (error) {
                return error;
              }
              if (parsed === iface.prefixLength) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) =>
                    candidate.id === iface.id ? { ...candidate, prefixLength: parsed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="MAC"
            name={`interface-mac-${iface.id}`}
            value={iface.macAddress}
            editable={editable}
            color="var(--netlab-accent-yellow)"
            minWidth={36}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error = validateMacAddress(trimmed);
              if (error) {
                return error;
              }
              if (trimmed === iface.macAddress) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) =>
                    candidate.id === iface.id ? { ...candidate, macAddress: trimmed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableSelectRow
            label="NAT"
            name={`interface-nat-${iface.id}`}
            value={iface.nat ?? ''}
            editable={editable}
            minWidth={36}
            options={[
              { label: 'none', value: '' },
              { label: 'inside', value: 'inside' },
              { label: 'outside', value: 'outside' },
            ]}
            onCommit={(nextValue) => {
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) => {
                    if (candidate.id !== iface.id) {
                      return candidate;
                    }
                    if (!nextValue) {
                      const { nat: _nat, ...restIface } = candidate;
                      return restIface;
                    }
                    return { ...candidate, nat: nextValue as 'inside' | 'outside' };
                  }),
                },
              }));
            }}
          />
        </div>
      ))}

      {staticRoutes.length > 0 && (
        <>
          <div style={SECTION_HEADER_STYLE}>EDIT STATIC ROUTES</div>
          {staticRoutes.map((route, index) => (
            <div key={`route-${index}`} style={{ marginBottom: 10 }}>
              <EditableTextRow
                label="CIDR"
                name={`route-destination-${index}`}
                value={route.destination}
                editable={editable}
                minWidth={42}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  const error = validateCidr(trimmed);
                  if (error) {
                    return error;
                  }
                  if (trimmed === route.destination) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      staticRoutes: (node.data.staticRoutes ?? []).map(
                        (candidate, candidateIndex) =>
                          candidateIndex === index
                            ? { ...candidate, destination: trimmed }
                            : candidate,
                      ),
                    },
                  }));
                  return null;
                }}
              />
              <EditableTextRow
                label="Next"
                name={`route-next-hop-${index}`}
                value={route.nextHop}
                editable={editable}
                minWidth={42}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  const error = trimmed === 'direct' ? null : validateIpAddress(trimmed);
                  if (error) {
                    return error;
                  }
                  if (trimmed === route.nextHop) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      staticRoutes: (node.data.staticRoutes ?? []).map(
                        (candidate, candidateIndex) =>
                          candidateIndex === index ? { ...candidate, nextHop: trimmed } : candidate,
                      ),
                    },
                  }));
                  return null;
                }}
              />
            </div>
          ))}
        </>
      )}

      {dhcpServer && (
        <>
          <div style={SECTION_HEADER_STYLE}>EDIT DHCP SERVER</div>
          <EditableTextRow
            label="Pool"
            name={`dhcp-pool-${nodeId}`}
            value={dhcpServer.leasePool}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error = validateCidr(trimmed);
              if (error) {
                return error;
              }
              if (trimmed === dhcpServer.leasePool) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  dhcpServer: {
                    ...(node.data.dhcpServer ?? dhcpServer),
                    leasePool: trimmed,
                  },
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="GW"
            name={`dhcp-default-gateway-${nodeId}`}
            value={dhcpServer.defaultGateway}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error = validateIpAddress(trimmed);
              if (error) {
                return error;
              }
              if (trimmed === dhcpServer.defaultGateway) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  dhcpServer: {
                    ...(node.data.dhcpServer ?? dhcpServer),
                    defaultGateway: trimmed,
                  },
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="Lease"
            name={`dhcp-lease-time-${nodeId}`}
            value={String(dhcpServer.leaseTime)}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const error = validatePositiveInteger(nextValue, 'Lease time');
              if (error) {
                return error;
              }
              const parsed = Number.parseInt(nextValue.trim(), 10);
              if (parsed === dhcpServer.leaseTime) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  dhcpServer: {
                    ...(node.data.dhcpServer ?? dhcpServer),
                    leaseTime: parsed,
                  },
                },
              }));
              return null;
            }}
          />
        </>
      )}

      {dnsServer && (
        <>
          <div style={SECTION_HEADER_STYLE}>EDIT DNS ZONES</div>
          {dnsServer.zones.map((zone, index) => (
            <div key={`dns-zone-${index}`} style={{ marginBottom: 10 }}>
              <EditableTextRow
                label="Name"
                name={`dns-zone-name-${index}`}
                value={zone.name}
                editable={editable}
                minWidth={52}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  if (!trimmed) {
                    return 'Zone name is required';
                  }
                  if (trimmed === zone.name) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      dnsServer: {
                        ...(node.data.dnsServer ?? dnsServer),
                        zones: (node.data.dnsServer?.zones ?? dnsServer.zones).map(
                          (candidate, candidateIndex) =>
                            candidateIndex === index ? { ...candidate, name: trimmed } : candidate,
                        ),
                      },
                    },
                  }));
                  return null;
                }}
              />
              <EditableTextRow
                label="IP"
                name={`dns-zone-address-${index}`}
                value={zone.address}
                editable={editable}
                minWidth={52}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  const error = validateIpAddress(trimmed);
                  if (error) {
                    return error;
                  }
                  if (trimmed === zone.address) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      dnsServer: {
                        ...(node.data.dnsServer ?? dnsServer),
                        zones: (node.data.dnsServer?.zones ?? dnsServer.zones).map(
                          (candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, address: trimmed }
                              : candidate,
                        ),
                      },
                    },
                  }));
                  return null;
                }}
              />
            </div>
          ))}
        </>
      )}
    </>
  );
}

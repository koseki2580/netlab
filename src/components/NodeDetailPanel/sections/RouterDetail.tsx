import type { NetlabNodeData } from '../../../types/topology';
import { MtuBadge, MtuInput } from '../_atoms';
import { vlanColor } from '../_colors';
import { ROW_STYLE, SECTION_HEADER_STYLE } from '../_styles';

export function RouterDetail({
  data,
  onInterfaceMtuChange,
  onSubInterfaceMtuChange,
}: {
  data: NetlabNodeData;
  onInterfaceMtuChange?: (interfaceId: string, mtu: number | undefined) => void;
  onSubInterfaceMtuChange?: (
    interfaceId: string,
    subInterfaceId: string,
    mtu: number | undefined,
  ) => void;
}) {
  const ifaces = data.interfaces ?? [];
  return (
    <>
      {ifaces.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>No interfaces</div>
      ) : (
        ifaces.map((iface) => (
          <div key={iface.id} style={{ marginBottom: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  color: 'var(--netlab-accent-green)',
                  fontWeight: 'bold',
                }}
              >
                {iface.name}
              </div>
              <MtuBadge mtu={iface.mtu} />
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IP</span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                {iface.ipAddress}/{iface.prefixLength}
              </span>
            </div>
            {iface.ipv6Address && iface.prefixLength6 !== undefined && (
              <div style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IPv6</span>
                <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                  {iface.ipv6Address}/{iface.prefixLength6}
                </span>
              </div>
            )}
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MAC</span>
              <span style={{ color: 'var(--netlab-accent-yellow)' }}>{iface.macAddress}</span>
            </div>
            {iface.greTunnel && (
              <div
                style={{
                  marginTop: 6,
                  padding: '5px 7px',
                  border: '1px solid var(--netlab-border-subtle)',
                  borderRadius: 6,
                }}
              >
                <div style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold' }}>
                  GRE tunnel
                </div>
                <div style={ROW_STYLE}>
                  <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Outer</span>
                  <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                    {iface.greTunnel.sourceIp}
                    {' -> '}
                    {iface.greTunnel.destinationIp}
                  </span>
                </div>
                {iface.greTunnel.key !== undefined && (
                  <div style={ROW_STYLE}>
                    <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Key</span>
                    <span style={{ color: 'var(--netlab-text-primary)' }}>
                      {iface.greTunnel.key}
                    </span>
                  </div>
                )}
              </div>
            )}
            {iface.vrrp && (
              <div
                style={{
                  marginTop: 6,
                  padding: '5px 7px',
                  border: '1px solid var(--netlab-border-subtle)',
                  borderRadius: 6,
                }}
              >
                <div style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold' }}>
                  {iface.vrrp.hsrpMode ? 'HSRP' : 'VRRP'} group {iface.vrrp.vrid}
                </div>
                <div style={ROW_STYLE}>
                  <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>VIP</span>
                  <span style={{ color: 'var(--netlab-accent-cyan)' }}>{iface.vrrp.virtualIp}</span>
                </div>
                <div style={ROW_STYLE}>
                  <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>
                    Priority
                  </span>
                  <span style={{ color: 'var(--netlab-text-primary)' }}>{iface.vrrp.priority}</span>
                </div>
              </div>
            )}
            <div style={{ ...ROW_STYLE, alignItems: 'center' }}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MTU</span>
              <MtuBadge mtu={iface.mtu} />
              {onInterfaceMtuChange && (
                <MtuInput
                  name={`interface-mtu-${iface.id}`}
                  mtu={iface.mtu}
                  onCommit={(mtu) => onInterfaceMtuChange(iface.id, mtu)}
                />
              )}
            </div>
            {(iface.subInterfaces ?? []).length > 0 && (
              <>
                <div style={SECTION_HEADER_STYLE}>SUB-INTERFACES</div>
                {(iface.subInterfaces ?? []).map((subInterface) => (
                  <div
                    key={subInterface.id}
                    style={{
                      marginBottom: 6,
                      paddingLeft: 10,
                      borderLeft: `2px solid ${vlanColor(subInterface.vlanId)}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          color: vlanColor(subInterface.vlanId),
                          fontWeight: 'bold',
                        }}
                      >
                        {subInterface.id}
                      </div>
                      <MtuBadge mtu={subInterface.mtu} />
                    </div>
                    <div style={ROW_STYLE}>
                      <span
                        style={{
                          color: 'var(--netlab-text-secondary)',
                          minWidth: 36,
                        }}
                      >
                        IP
                      </span>
                      <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                        {subInterface.ipAddress}/{subInterface.prefixLength}
                      </span>
                    </div>
                    {subInterface.ipv6Address && subInterface.prefixLength6 !== undefined && (
                      <div style={ROW_STYLE}>
                        <span
                          style={{
                            color: 'var(--netlab-text-secondary)',
                            minWidth: 36,
                          }}
                        >
                          IPv6
                        </span>
                        <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                          {subInterface.ipv6Address}/{subInterface.prefixLength6}
                        </span>
                      </div>
                    )}
                    <div style={ROW_STYLE}>
                      <span
                        style={{
                          color: 'var(--netlab-text-secondary)',
                          minWidth: 36,
                        }}
                      >
                        VLAN
                      </span>
                      <span style={{ color: vlanColor(subInterface.vlanId) }}>
                        {subInterface.vlanId}
                      </span>
                    </div>
                    <div style={{ ...ROW_STYLE, alignItems: 'center' }}>
                      <span
                        style={{
                          color: 'var(--netlab-text-secondary)',
                          minWidth: 36,
                        }}
                      >
                        MTU
                      </span>
                      <MtuBadge mtu={subInterface.mtu} />
                      {onSubInterfaceMtuChange && (
                        <MtuInput
                          name={`subinterface-mtu-${subInterface.id}`}
                          mtu={subInterface.mtu}
                          onCommit={(mtu) =>
                            onSubInterfaceMtuChange(iface.id, subInterface.id, mtu)
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))
      )}
    </>
  );
}

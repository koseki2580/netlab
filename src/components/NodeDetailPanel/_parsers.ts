import type { TopologySnapshot } from '../../types/topology';

export function parseMtu(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseOptionalInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function validateNonNegativeInteger(value: string, label: string): string | null {
  const parsed = parseOptionalInteger(value);
  if (parsed === undefined) {
    return null;
  }
  return parsed >= 0 ? null : `${label} must be 0 or greater`;
}

export function validatePositiveInteger(value: string, label: string): string | null {
  const parsed = parseOptionalInteger(value);
  if (parsed === undefined || parsed <= 0) {
    return `${label} must be greater than 0`;
  }
  return null;
}

export function parseTrunkAllowedVlans(value: string): {
  vlans: number[] | undefined;
  error: string | null;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { vlans: undefined, error: null };
  }

  const parts = trimmed.split(',').map((part) => part.trim());
  const vlans = parts.map((part) => Number.parseInt(part, 10));
  if (vlans.some((v) => !Number.isFinite(v) || v < 0)) {
    return { vlans: undefined, error: 'Allowed VLANs must be a comma-separated number list' };
  }
  return { vlans, error: null };
}

export function collectConfiguredIps(
  snapshot: TopologySnapshot,
  ignore?: {
    nodeId?: string;
    interfaceId?: string;
    subInterfaceId?: string;
  },
): string[] {
  return snapshot.nodes.flatMap((candidate) => {
    const ips: string[] = [];
    if (candidate.id !== ignore?.nodeId && typeof candidate.data.ip === 'string') {
      ips.push(candidate.data.ip);
    }
    if (candidate.id !== ignore?.nodeId && typeof candidate.data.ipv6 === 'string') {
      ips.push(candidate.data.ipv6);
    }

    for (const iface of candidate.data.interfaces ?? []) {
      if (candidate.id === ignore?.nodeId && iface.id === ignore?.interfaceId) {
        continue;
      }
      ips.push(iface.ipAddress);
      if (iface.ipv6Address) {
        ips.push(iface.ipv6Address);
      }

      for (const subInterface of iface.subInterfaces ?? []) {
        if (
          candidate.id === ignore?.nodeId &&
          iface.id === ignore?.interfaceId &&
          subInterface.id === ignore?.subInterfaceId
        ) {
          continue;
        }
        ips.push(subInterface.ipAddress);
        if (subInterface.ipv6Address) {
          ips.push(subInterface.ipv6Address);
        }
      }
    }

    return ips;
  });
}

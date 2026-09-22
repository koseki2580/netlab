import { useI18n } from '../../../i18n/useI18n';
import type { NetlabNode, NetlabNodeData } from '../../../types/topology';
import { EditableSelectRow, EditableTextRow } from '../_atoms';
import {
  parseOptionalInteger,
  parseTrunkAllowedVlans,
  validateNonNegativeInteger,
} from '../_parsers';
import { SECTION_HEADER_STYLE } from '../_styles';

export function SwitchEditorSection({
  data,
  editable,
  updateNode,
}: {
  data: NetlabNodeData;
  editable: boolean;
  updateNode: (updater: (node: NetlabNode) => NetlabNode) => void;
}) {
  const { t } = useI18n();
  const ports = data.ports ?? [];

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.edit.ports')}</div>
      {ports.map((port) => (
        <div key={`${port.id}-edit`} style={{ marginBottom: 10 }}>
          <EditableTextRow
            label={t('simulation.nodeDetail.switch.port')}
            name={`switch-port-name-${port.id}`}
            value={port.name}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              if (!trimmed || trimmed === port.name) {
                return trimmed ? null : t('simulation.nodeDetail.edit.portNameRequired');
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) =>
                    candidate.id === port.id ? { ...candidate, name: trimmed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label={t('simulation.nodeDetail.switch.access')}
            name={`switch-port-access-vlan-${port.id}`}
            value={port.accessVlan === undefined ? '' : String(port.accessVlan)}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const error = validateNonNegativeInteger(
                nextValue,
                t('simulation.nodeDetail.edit.accessVlan'),
                t,
              );
              if (error) {
                return error;
              }
              const parsed = parseOptionalInteger(nextValue);
              if (parsed === port.accessVlan) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) => {
                    if (candidate.id !== port.id) {
                      return candidate;
                    }
                    if (parsed === undefined) {
                      const { accessVlan: _accessVlan, ...restPort } = candidate;
                      return restPort;
                    }
                    return { ...candidate, accessVlan: parsed };
                  }),
                },
              }));
              return null;
            }}
          />
          <EditableSelectRow
            label={t('simulation.nodeDetail.switch.mode')}
            name={`switch-port-mode-${port.id}`}
            value={port.vlanMode ?? ''}
            editable={editable}
            minWidth={52}
            options={[
              { label: 'access', value: 'access' },
              { label: 'trunk', value: 'trunk' },
            ]}
            onCommit={(nextValue) => {
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) =>
                    candidate.id === port.id
                      ? { ...candidate, vlanMode: nextValue as 'access' | 'trunk' }
                      : candidate,
                  ),
                },
              }));
            }}
          />
          <EditableTextRow
            label={t('simulation.nodeDetail.switch.allowed')}
            name={`switch-port-allowed-vlans-${port.id}`}
            value={port.trunkAllowedVlans?.join(', ') ?? ''}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const { vlans, error } = parseTrunkAllowedVlans(nextValue, t);
              if (error) {
                return error;
              }
              const current = port.trunkAllowedVlans?.join(',') ?? '';
              if ((vlans?.join(',') ?? '') === current) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) => {
                    if (candidate.id !== port.id) {
                      return candidate;
                    }
                    if (!vlans || vlans.length === 0) {
                      const { trunkAllowedVlans: _allowed, ...restPort } = candidate;
                      return restPort;
                    }
                    return { ...candidate, trunkAllowedVlans: vlans };
                  }),
                },
              }));
              return null;
            }}
          />
        </div>
      ))}
    </>
  );
}

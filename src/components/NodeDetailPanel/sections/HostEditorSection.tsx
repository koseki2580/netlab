import type { NetlabNode, NetlabNodeData, TopologySnapshot } from '../../../types/topology';
import {
  validateIpAddress,
  validateMacAddress,
  validateNoDuplicateIp,
} from '../../../utils/networkValidators';
import { EditableTextRow } from '../_atoms';
import { collectConfiguredIps } from '../_parsers';
import { SECTION_HEADER_STYLE } from '../_styles';

export function HostEditorSection({
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
  const configuredIps = collectConfiguredIps(snapshot, { nodeId });

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>EDIT HOST</div>
      <EditableTextRow
        label="IP"
        name={`host-ip-${nodeId}`}
        value={data.ip ?? ''}
        editable={editable}
        color="var(--netlab-accent-cyan)"
        minWidth={36}
        onCommit={(nextValue) => {
          const trimmed = nextValue.trim();
          if (trimmed) {
            const ipError =
              validateIpAddress(trimmed) ?? validateNoDuplicateIp(trimmed, configuredIps);
            if (ipError) {
              return ipError;
            }
          }

          if (trimmed === (data.ip ?? '')) {
            return null;
          }

          updateNode((node) => ({
            ...node,
            data:
              trimmed === ''
                ? (() => {
                    const { ip: _ip, ...restData } = node.data;
                    return restData;
                  })()
                : { ...node.data, ip: trimmed },
          }));
          return null;
        }}
      />
      <EditableTextRow
        label="MAC"
        name={`host-mac-${nodeId}`}
        value={data.mac ?? ''}
        editable={editable}
        color="var(--netlab-accent-yellow)"
        minWidth={36}
        onCommit={(nextValue) => {
          const trimmed = nextValue.trim();
          if (trimmed) {
            const macError = validateMacAddress(trimmed);
            if (macError) {
              return macError;
            }
          }

          if (trimmed === (data.mac ?? '')) {
            return null;
          }

          updateNode((node) => ({
            ...node,
            data:
              trimmed === ''
                ? (() => {
                    const { mac: _mac, ...restData } = node.data;
                    return restData;
                  })()
                : { ...node.data, mac: trimmed },
          }));
          return null;
        }}
      />
    </>
  );
}

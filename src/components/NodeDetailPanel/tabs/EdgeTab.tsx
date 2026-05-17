import { memo } from 'react';
import type { LinkQosConfig } from '../../../types/link';
import type { NetworkTopology, TopologySnapshot } from '../../../types/topology';
import { EdgeDetail } from '../sections/EdgeDetail';
import { setEdgeLinkQos, setEdgeMtu } from '../topologyMutators';

export interface EdgeTabProps {
  edge: NetworkTopology['edges'][number];
  topology: NetworkTopology;
  onTopologyChange: ((topology: TopologySnapshot) => void) | undefined;
  updateSnapshot: (update: (snapshot: TopologySnapshot) => TopologySnapshot) => void;
}

export const EdgeTab = memo(function EdgeTab({
  edge,
  topology,
  onTopologyChange,
  updateSnapshot,
}: EdgeTabProps): JSX.Element {
  return (
    <EdgeDetail
      edge={edge}
      topology={topology}
      {...(onTopologyChange
        ? {
            onMtuChange: (mtu: number | undefined) => {
              updateSnapshot((snapshot) => setEdgeMtu(snapshot, edge.id, mtu));
            },
          }
        : {})}
      {...(onTopologyChange
        ? {
            onQosChange: (link: LinkQosConfig) => {
              updateSnapshot((snapshot) => setEdgeLinkQos(snapshot, edge.id, link));
            },
          }
        : {})}
    />
  );
});

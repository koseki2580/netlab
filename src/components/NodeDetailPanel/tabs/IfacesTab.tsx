import { memo } from 'react';
import type { SimulationContextValue } from '../../../simulation/SimulationContext';
import type { NetworkTopology, TopologySnapshot } from '../../../types/topology';
import { RouterDetail } from '../sections/RouterDetail';
import { SwitchDetail } from '../sections/SwitchDetail';
import { MulticastMembershipDetail, MulticastSnoopingDetail } from '../sections/services';
import { setInterfaceMtu, setSubInterfaceMtu } from '../topologyMutators';

export interface IfacesTabProps {
  nodeId: string;
  data: NetworkTopology['nodes'][number]['data'];
  topology: NetworkTopology;
  role: string;
  igmpMemberships: ReturnType<SimulationContextValue['engine']['getIgmpMembershipSnapshot']>;
  multicastTableSnapshot: ReturnType<SimulationContextValue['engine']['getMulticastTableSnapshot']>;
  hasSimulation: boolean;
  updateSnapshot: (update: (snapshot: TopologySnapshot) => TopologySnapshot) => void;
}

export const IfacesTab = memo(function IfacesTab({
  nodeId,
  data,
  topology,
  role,
  igmpMemberships,
  multicastTableSnapshot,
  hasSimulation,
  updateSnapshot,
}: IfacesTabProps): JSX.Element | null {
  if (role === 'router') {
    return (
      <>
        <RouterDetail
          data={data}
          onInterfaceMtuChange={(interfaceId: string, mtu: number | undefined) => {
            updateSnapshot((snap) => setInterfaceMtu(snap, nodeId, interfaceId, mtu));
          }}
          onSubInterfaceMtuChange={(
            interfaceId: string,
            subInterfaceId: string,
            mtu: number | undefined,
          ) => {
            updateSnapshot((snap) =>
              setSubInterfaceMtu(snap, nodeId, interfaceId, subInterfaceId, mtu),
            );
          }}
        />
        {hasSimulation && <MulticastMembershipDetail memberships={igmpMemberships} />}
      </>
    );
  }
  if (role === 'switch') {
    return (
      <>
        <SwitchDetail nodeId={nodeId} data={data} topology={topology} />
        {hasSimulation && <MulticastSnoopingDetail entries={multicastTableSnapshot} />}
      </>
    );
  }
  return null;
});

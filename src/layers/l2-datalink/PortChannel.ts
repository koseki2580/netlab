import { bucketFlow, type FlowKey } from '../../utils/hashFlow';

export interface PortChannelConfig {
  readonly id: string;
  readonly activeMemberPortIds: readonly string[];
  readonly standbyMemberPortIds?: readonly string[];
}

export class PortChannel {
  readonly id: string;
  readonly activeMemberPortIds: readonly string[];
  readonly standbyMemberPortIds: readonly string[];

  constructor(config: PortChannelConfig) {
    if (config.activeMemberPortIds.length === 0) {
      throw new RangeError('PortChannel requires at least one active member');
    }
    this.id = config.id;
    this.activeMemberPortIds = [...config.activeMemberPortIds].sort();
    this.standbyMemberPortIds = [...(config.standbyMemberPortIds ?? [])].sort();
  }

  selectMember(flow: FlowKey): { memberPortId: string } {
    const index = bucketFlow(flow, this.activeMemberPortIds.length);
    return { memberPortId: this.activeMemberPortIds[index] ?? this.activeMemberPortIds[0]! };
  }

  withoutMember(portId: string): PortChannel {
    const survivors = this.activeMemberPortIds.filter((member) => member !== portId);
    return new PortChannel({ id: this.id, activeMemberPortIds: survivors });
  }
}

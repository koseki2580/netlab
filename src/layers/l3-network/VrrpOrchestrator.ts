import type { VrrpMember } from '../../types/vrrp';
import { electVrrpMaster, virtualRouterMac } from './VrrpStateMachine';

export class VrrpOrchestrator {
  private readonly downNodes = new Set<string>();

  constructor(private readonly members: readonly VrrpMember[]) {}

  markNodeDown(nodeId: string): void {
    this.downNodes.add(nodeId);
  }

  currentMaster(virtualIp: string): VrrpMember | null {
    return electVrrpMaster(
      this.members.filter(
        (member) => member.config.virtualIp === virtualIp && !this.downNodes.has(member.nodeId),
      ),
    );
  }

  isMaster(nodeId: string, interfaceId: string): boolean {
    const member = this.members.find(
      (candidate) => candidate.nodeId === nodeId && candidate.interfaceId === interfaceId,
    );
    if (!member) return false;
    return this.currentMaster(member.config.virtualIp) === member;
  }

  resolveVirtualMac(virtualIp: string): string | null {
    const master = this.currentMaster(virtualIp);
    return master ? virtualRouterMac(master.config) : null;
  }
}

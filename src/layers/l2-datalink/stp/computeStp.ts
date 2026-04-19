import type {
  BridgeId,
  NetworkTopology,
  StpPortRole,
  StpPortRuntime,
} from '../../../types/topology';
import { DEFAULT_STP_PATH_COST } from './BridgeId';
import { collectSwitchBridges, electRoot } from './rootElection';
import { compareBridgeId } from './BridgeId';

export interface StpResult {
  root: BridgeId | null;
  ports: Map<string, StpPortRuntime>;
}

interface SwitchLink {
  edgeId: string;
  leftNodeId: string;
  leftPortId: string;
  rightNodeId: string;
  rightPortId: string;
}

interface PathStep {
  upstreamNodeId: string;
  localPortId: string;
}

function makePortKey(switchNodeId: string, portId: string): string {
  return `${switchNodeId}:${portId}`;
}

function stateForRole(role: StpPortRole): StpPortRuntime['state'] {
  if (role === 'BLOCKED') return 'BLOCKING';
  if (role === 'DISABLED') return 'DISABLED';
  return 'FORWARDING';
}

function buildPortRuntime(
  switchNodeId: string,
  portId: string,
  role: StpPortRole,
  designatedBridge: BridgeId,
  rootPathCost: number,
): StpPortRuntime {
  return {
    switchNodeId,
    portId,
    role,
    state: stateForRole(role),
    designatedBridge,
    rootPathCost,
  };
}

function comparePortIds(leftPortId: string, rightPortId: string): number {
  return leftPortId.localeCompare(rightPortId);
}

export function computeStp(topology: NetworkTopology): StpResult {
  const bridges = collectSwitchBridges(topology);
  const rootBridge = electRoot(bridges);
  const ports = new Map<string, StpPortRuntime>();

  if (!rootBridge) {
    return { root: null, ports };
  }

  const bridgeIdByNodeId = new Map(bridges.map((bridge) => [bridge.nodeId, bridge.bridgeId]));
  const switchNodeById = new Map(
    topology.nodes.filter((node) => node.data.role === 'switch').map((node) => [node.id, node]),
  );
  const switchPortsByNodeId = new Map(
    [...switchNodeById.entries()].map(([nodeId, node]) => [
      nodeId,
      new Map((node.data.ports ?? []).map((port) => [port.id, port])),
    ]),
  );
  const disabledPortKeys = new Set<string>();
  const leafPortKeys = new Set<string>();
  const activeLinks: SwitchLink[] = [];

  for (const [nodeId, node] of switchNodeById.entries()) {
    for (const portId of node.data.stpConfig?.disabledPortIds ?? []) {
      disabledPortKeys.add(makePortKey(nodeId, portId));
    }
  }

  for (const edge of topology.edges) {
    const sourceIsSwitch = switchNodeById.has(edge.source);
    const targetIsSwitch = switchNodeById.has(edge.target);

    if (sourceIsSwitch && targetIsSwitch && edge.sourceHandle && edge.targetHandle) {
      const sourceKey = makePortKey(edge.source, edge.sourceHandle);
      const targetKey = makePortKey(edge.target, edge.targetHandle);
      const sourceDisabled = disabledPortKeys.has(sourceKey);
      const targetDisabled = disabledPortKeys.has(targetKey);

      if (!sourceDisabled && !targetDisabled) {
        activeLinks.push({
          edgeId: edge.id,
          leftNodeId: edge.source,
          leftPortId: edge.sourceHandle,
          rightNodeId: edge.target,
          rightPortId: edge.targetHandle,
        });
      } else if (!sourceDisabled) {
        leafPortKeys.add(sourceKey);
      } else if (!targetDisabled) {
        leafPortKeys.add(targetKey);
      }

      continue;
    }

    if (sourceIsSwitch && edge.sourceHandle) {
      const sourceKey = makePortKey(edge.source, edge.sourceHandle);
      if (!disabledPortKeys.has(sourceKey)) {
        leafPortKeys.add(sourceKey);
      }
    }

    if (targetIsSwitch && edge.targetHandle) {
      const targetKey = makePortKey(edge.target, edge.targetHandle);
      if (!disabledPortKeys.has(targetKey)) {
        leafPortKeys.add(targetKey);
      }
    }
  }

  const distanceByNodeId = new Map<string, number>();
  const pathStepByNodeId = new Map<string, PathStep>();

  for (const bridge of bridges) {
    distanceByNodeId.set(bridge.nodeId, Number.POSITIVE_INFINITY);
  }
  distanceByNodeId.set(rootBridge.nodeId, 0);

  const remaining = new Set(bridges.map((bridge) => bridge.nodeId));

  while (remaining.size > 0) {
    let currentNodeId: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of remaining) {
      const candidateDistance = distanceByNodeId.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (
        currentNodeId === null ||
        candidateDistance < currentDistance ||
        (candidateDistance === currentDistance &&
          compareBridgeId(bridgeIdByNodeId.get(nodeId)!, bridgeIdByNodeId.get(currentNodeId)!) < 0)
      ) {
        currentNodeId = nodeId;
        currentDistance = candidateDistance;
      }
    }

    if (currentNodeId === null) {
      break;
    }

    remaining.delete(currentNodeId);
    if (!Number.isFinite(currentDistance)) {
      continue;
    }

    for (const link of activeLinks) {
      let neighborNodeId: string | null = null;
      let neighborPortId: string | null = null;

      if (link.leftNodeId === currentNodeId) {
        neighborNodeId = link.rightNodeId;
        neighborPortId = link.rightPortId;
      } else if (link.rightNodeId === currentNodeId) {
        neighborNodeId = link.leftNodeId;
        neighborPortId = link.leftPortId;
      }

      if (!neighborNodeId || !neighborPortId || !remaining.has(neighborNodeId)) {
        continue;
      }

      const neighborPort = switchPortsByNodeId.get(neighborNodeId)?.get(neighborPortId);
      const candidateDistance =
        currentDistance + (neighborPort?.stpPathCost ?? DEFAULT_STP_PATH_COST);
      const existingDistance = distanceByNodeId.get(neighborNodeId) ?? Number.POSITIVE_INFINITY;
      const existingStep = pathStepByNodeId.get(neighborNodeId);
      const shouldReplace =
        candidateDistance < existingDistance ||
        (candidateDistance === existingDistance &&
          (!existingStep ||
            compareBridgeId(
              bridgeIdByNodeId.get(currentNodeId)!,
              bridgeIdByNodeId.get(existingStep.upstreamNodeId)!,
            ) < 0 ||
            (compareBridgeId(
              bridgeIdByNodeId.get(currentNodeId)!,
              bridgeIdByNodeId.get(existingStep.upstreamNodeId)!,
            ) === 0 &&
              comparePortIds(neighborPortId, existingStep.localPortId) < 0)));

      if (shouldReplace) {
        distanceByNodeId.set(neighborNodeId, candidateDistance);
        pathStepByNodeId.set(neighborNodeId, {
          upstreamNodeId: currentNodeId,
          localPortId: neighborPortId,
        });
      }
    }
  }

  const rootPortByNodeId = new Map<string, string>();
  for (const [nodeId, step] of pathStepByNodeId.entries()) {
    rootPortByNodeId.set(nodeId, step.localPortId);
  }

  for (const [nodeId, node] of switchNodeById.entries()) {
    const bridgeId = bridgeIdByNodeId.get(nodeId)!;
    const rootPathCost = distanceByNodeId.get(nodeId) ?? Number.POSITIVE_INFINITY;

    for (const port of node.data.ports ?? []) {
      if (!disabledPortKeys.has(makePortKey(nodeId, port.id))) {
        continue;
      }

      ports.set(
        makePortKey(nodeId, port.id),
        buildPortRuntime(nodeId, port.id, 'DISABLED', bridgeId, rootPathCost),
      );
    }
  }

  for (const link of activeLinks) {
    const leftBridgeId = bridgeIdByNodeId.get(link.leftNodeId)!;
    const rightBridgeId = bridgeIdByNodeId.get(link.rightNodeId)!;
    const leftDistance = distanceByNodeId.get(link.leftNodeId) ?? Number.POSITIVE_INFINITY;
    const rightDistance = distanceByNodeId.get(link.rightNodeId) ?? Number.POSITIVE_INFINITY;

    let designatedNodeId = link.leftNodeId;
    let designatedPortId = link.leftPortId;
    let otherNodeId = link.rightNodeId;
    let otherPortId = link.rightPortId;
    let designatedBridge = leftBridgeId;

    const distanceComparison = leftDistance - rightDistance;
    const bridgeComparison = compareBridgeId(leftBridgeId, rightBridgeId);
    const portComparison = comparePortIds(link.leftPortId, link.rightPortId);

    if (
      distanceComparison > 0 ||
      (distanceComparison === 0 && bridgeComparison > 0) ||
      (distanceComparison === 0 && bridgeComparison === 0 && portComparison > 0)
    ) {
      designatedNodeId = link.rightNodeId;
      designatedPortId = link.rightPortId;
      otherNodeId = link.leftNodeId;
      otherPortId = link.leftPortId;
      designatedBridge = rightBridgeId;
    }

    ports.set(
      makePortKey(designatedNodeId, designatedPortId),
      buildPortRuntime(
        designatedNodeId,
        designatedPortId,
        'DESIGNATED',
        designatedBridge,
        distanceByNodeId.get(designatedNodeId) ?? Number.POSITIVE_INFINITY,
      ),
    );

    const otherRole = rootPortByNodeId.get(otherNodeId) === otherPortId ? 'ROOT' : 'BLOCKED';
    ports.set(
      makePortKey(otherNodeId, otherPortId),
      buildPortRuntime(
        otherNodeId,
        otherPortId,
        otherRole,
        designatedBridge,
        distanceByNodeId.get(otherNodeId) ?? Number.POSITIVE_INFINITY,
      ),
    );
  }

  for (const portKey of leafPortKeys) {
    if (ports.has(portKey)) {
      continue;
    }

    const [nodeId, portId] = portKey.split(':');
    if (!nodeId || !portId) {
      continue;
    }

    ports.set(
      portKey,
      buildPortRuntime(
        nodeId,
        portId,
        'DESIGNATED',
        bridgeIdByNodeId.get(nodeId)!,
        distanceByNodeId.get(nodeId) ?? Number.POSITIVE_INFINITY,
      ),
    );
  }

  for (const [nodeId, node] of switchNodeById.entries()) {
    const bridgeId = bridgeIdByNodeId.get(nodeId)!;
    const rootPathCost = distanceByNodeId.get(nodeId) ?? Number.POSITIVE_INFINITY;

    for (const port of node.data.ports ?? []) {
      const portKey = makePortKey(nodeId, port.id);
      if (ports.has(portKey)) {
        continue;
      }

      const role = rootPortByNodeId.get(nodeId) === port.id ? 'ROOT' : 'DESIGNATED';
      ports.set(portKey, buildPortRuntime(nodeId, port.id, role, bridgeId, rootPathCost));
    }
  }

  return {
    root: rootBridge.bridgeId,
    ports,
  };
}

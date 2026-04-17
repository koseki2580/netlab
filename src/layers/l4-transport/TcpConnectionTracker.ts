import type { TcpConnection, TcpFourTuple, TcpState } from '../../types/tcp';

function cloneConnection(connection: TcpConnection): TcpConnection {
  return { ...connection };
}

function matchesFourTuple(connection: TcpConnection, fourTuple: TcpFourTuple): boolean {
  const forwardMatch =
    connection.srcIp === fourTuple.srcIp &&
    connection.srcPort === fourTuple.srcPort &&
    connection.dstIp === fourTuple.dstIp &&
    connection.dstPort === fourTuple.dstPort;

  const reverseMatch =
    connection.srcIp === fourTuple.dstIp &&
    connection.srcPort === fourTuple.dstPort &&
    connection.dstIp === fourTuple.srcIp &&
    connection.dstPort === fourTuple.srcPort;

  return forwardMatch || reverseMatch;
}

export class TcpConnectionTracker {
  private readonly connections = new Map<string, TcpConnection>();

  addConnection(connection: TcpConnection): void {
    this.connections.set(connection.id, cloneConnection(connection));
  }

  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  updateState(connectionId: string, newState: TcpState): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    this.connections.set(connectionId, {
      ...connection,
      state: newState,
    });
  }

  getConnectionsForNode(nodeId: string): TcpConnection[] {
    return Array.from(this.connections.values())
      .filter((connection) => connection.srcNodeId === nodeId || connection.dstNodeId === nodeId)
      .map(cloneConnection);
  }

  findByFourTuple(fourTuple: TcpFourTuple): TcpConnection | null {
    const match = Array.from(this.connections.values()).find((connection) =>
      matchesFourTuple(connection, fourTuple),
    );

    return match ? cloneConnection(match) : null;
  }

  clear(): void {
    this.connections.clear();
  }

  serialize(): TcpConnection[] {
    return Array.from(this.connections.values()).map(cloneConnection);
  }
}

import type { LacpPdu, LacpRuntimePort } from '../../types/lacp';

export function receiveLacpPdu(port: LacpRuntimePort, pdu: LacpPdu): LacpRuntimePort {
  const matchingKey = port.config.key === pdu.key;
  const canDistribute = matchingKey && pdu.aggregation && pdu.synchronized;
  return {
    ...port,
    state: canDistribute ? 'distributing' : 'current',
  };
}

export function lacpTimeoutMs(port: LacpRuntimePort): number {
  return port.config.fastTimer ? 3000 : 90_000;
}

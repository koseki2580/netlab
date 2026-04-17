export type TcpState =
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN_SENT'
  | 'SYN_RECEIVED'
  | 'ESTABLISHED'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'CLOSE_WAIT'
  | 'LAST_ACK'
  | 'TIME_WAIT';

export type TcpEvent =
  | 'ACTIVE_OPEN'
  | 'PASSIVE_OPEN'
  | 'SYN_RECEIVED'
  | 'SYN_ACK_RECEIVED'
  | 'ACK_RECEIVED'
  | 'FIN_RECEIVED'
  | 'CLOSE'
  | 'TIMEOUT'
  | 'RST_RECEIVED';

export interface TcpConnection {
  id: string;
  srcNodeId: string;
  dstNodeId: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  state: TcpState;
  localSeq: number;
  localAck: number;
  remoteSeq: number;
  createdAt: number;
}

export interface TcpTransitionResult {
  newState: TcpState;
  action: TcpAction;
}

export type TcpAction =
  | { type: 'SEND_SYN' }
  | { type: 'SEND_SYN_ACK' }
  | { type: 'SEND_ACK' }
  | { type: 'SEND_FIN' }
  | { type: 'SEND_RST' }
  | { type: 'NONE' }
  | { type: 'ERROR'; reason: string };

export interface TcpFourTuple {
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
}

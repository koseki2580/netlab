import type { TcpCongestionState } from './tcp-congestion';

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

/** What a handshake settled. Sizes are per direction: there is no single agreed MSS. */
export interface TcpNegotiatedOptions {
  /** Most data the client puts in a segment, and the same for the server. */
  clientSendMss: number;
  serverSendMss: number;
  /** Both ends offered window scale. */
  windowScaling: boolean;
  /** The shift each end applies to the windows it advertises; 0 without scaling. */
  clientWindowShift: number;
  serverWindowShift: number;
  sackPermitted: boolean;
}

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
  congestion?: TcpCongestionState;
  negotiated?: TcpNegotiatedOptions;
  /** Each end's receive buffer, in bytes. */
  clientReceiveBuffer?: number;
  serverReceiveBuffer?: number;
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

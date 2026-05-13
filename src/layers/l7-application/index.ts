import { registerLayerPlugin } from '../../registry/LayerRegistry';
import { ClientNode } from './ClientNode';
import { ServerNode } from './ServerNode';

registerLayerPlugin({
  layerId: 'l7',
  nodeTypes: {
    client: ClientNode,
    server: ServerNode,
  },
  deviceRoles: ['client', 'server'],
});

export { ClientNode } from './ClientNode';
export { ServerNode } from './ServerNode';
export { parseHttp2Frame, serializeHttp2Frame } from './h2/Http2Frame';
export { HTTP2_FLAGS, HTTP2_FRAME_TYPE } from './h2/Http2FrameTypes';
export type { Http2Frame, Http2Setting } from './h2/Http2FrameTypes';
export { decodeHpack, encodeHpack } from './h2/Hpack';
export { HPACK_STATIC_TABLE, hpackStaticHeader, hpackStaticIndex } from './h2/HpackStaticTable';
export type { HeaderTuple } from './h2/HpackStaticTable';
export { Http2Orchestrator } from './h2/Http2Orchestrator';
export type { Http2Run, Http2StreamSummary } from './h2/Http2Orchestrator';
export { parseHttp3Frame, serializeHttp3Frame } from './h3/Http3Frame';
export type { Http3Frame } from './h3/Http3Frame';
export { decodeQpack, encodeQpack } from './h3/Qpack';
export { QPACK_STATIC_TABLE, qpackStaticHeader, qpackStaticIndex } from './h3/QpackStaticTable';
export { Http3Orchestrator } from './h3/Http3Orchestrator';
export type { Http3Run, Http3StreamSummary } from './h3/Http3Orchestrator';

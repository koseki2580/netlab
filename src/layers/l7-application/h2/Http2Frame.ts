import { HTTP2_FRAME_TYPE, type Http2Frame } from './Http2FrameTypes';

function u24(value: number): number[] {
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function readU24(bytes: Uint8Array): number {
  return ((bytes[0] ?? 0) << 16) | ((bytes[1] ?? 0) << 8) | (bytes[2] ?? 0);
}

function u32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) * 0x1000000 +
    (((bytes[offset + 1] ?? 0) << 16) | ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0))
  );
}

function frameType(frame: Http2Frame): number {
  return HTTP2_FRAME_TYPE[frame.kind];
}

function payloadFor(frame: Http2Frame): Uint8Array {
  switch (frame.kind) {
    case 'DATA':
      return frame.data;
    case 'HEADERS':
    case 'CONTINUATION':
      return frame.headerBlock;
    case 'SETTINGS': {
      const out: number[] = [];
      for (const setting of frame.settings) {
        out.push((setting.id >> 8) & 0xff, setting.id & 0xff, ...u32(setting.value));
      }
      return Uint8Array.from(out);
    }
    case 'WINDOW_UPDATE':
      return Uint8Array.from(u32(frame.increment & 0x7fffffff));
    case 'PING':
      if (frame.opaqueData.length !== 8)
        throw new RangeError('HTTP/2 PING payload must be 8 bytes');
      return frame.opaqueData;
    case 'GOAWAY':
      return Uint8Array.from([
        ...u32(frame.lastStreamId & 0x7fffffff),
        ...u32(frame.errorCode),
        ...frame.debugData,
      ]);
    case 'RST_STREAM':
      return Uint8Array.from(u32(frame.errorCode));
    case 'PRIORITY': {
      const dep = frame.depStreamId & 0x7fffffff;
      return Uint8Array.from([
        ...(frame.exclusive ? u32(dep | 0x80000000) : u32(dep)),
        frame.weight,
      ]);
    }
  }
}

export function serializeHttp2Frame(frame: Http2Frame): Uint8Array {
  const payload = payloadFor(frame);
  const streamId = 'streamId' in frame ? frame.streamId : 0;
  const flags = 'flags' in frame ? frame.flags : 0;
  const out = new Uint8Array(9 + payload.length);
  out.set(u24(payload.length), 0);
  out[3] = frameType(frame);
  out[4] = flags;
  out.set(u32(streamId & 0x7fffffff), 5);
  out.set(payload, 9);
  return out;
}

export function parseHttp2Frame(bytes: Uint8Array): Http2Frame {
  if (bytes.length < 9) throw new RangeError('HTTP/2 frame header must be at least 9 bytes');
  const length = readU24(bytes);
  if (bytes.length < 9 + length) throw new RangeError('HTTP/2 frame payload is truncated');
  const type = bytes[3] ?? 0;
  const flags = bytes[4] ?? 0;
  const streamId = readU32(bytes, 5) & 0x7fffffff;
  const payload = bytes.slice(9, 9 + length);

  switch (type) {
    case HTTP2_FRAME_TYPE.DATA:
      return { kind: 'DATA', streamId, flags, data: payload };
    case HTTP2_FRAME_TYPE.HEADERS:
      return { kind: 'HEADERS', streamId, flags, headerBlock: payload };
    case HTTP2_FRAME_TYPE.SETTINGS: {
      if (payload.length % 6 !== 0)
        throw new RangeError('HTTP/2 SETTINGS payload must be 6-byte aligned');
      const settings = [];
      for (let offset = 0; offset < payload.length; offset += 6) {
        settings.push({
          id: ((payload[offset] ?? 0) << 8) | (payload[offset + 1] ?? 0),
          value: readU32(payload, offset + 2),
        });
      }
      return { kind: 'SETTINGS', flags, settings };
    }
    case HTTP2_FRAME_TYPE.WINDOW_UPDATE:
      return { kind: 'WINDOW_UPDATE', streamId, increment: readU32(payload, 0) & 0x7fffffff };
    case HTTP2_FRAME_TYPE.PING:
      if (payload.length !== 8) throw new RangeError('HTTP/2 PING payload must be 8 bytes');
      return { kind: 'PING', flags, opaqueData: payload };
    case HTTP2_FRAME_TYPE.GOAWAY:
      return {
        kind: 'GOAWAY',
        lastStreamId: readU32(payload, 0) & 0x7fffffff,
        errorCode: readU32(payload, 4),
        debugData: payload.slice(8),
      };
    case HTTP2_FRAME_TYPE.RST_STREAM:
      return { kind: 'RST_STREAM', streamId, errorCode: readU32(payload, 0) };
    case HTTP2_FRAME_TYPE.PRIORITY: {
      const dep = readU32(payload, 0);
      return {
        kind: 'PRIORITY',
        streamId,
        exclusive: (dep & 0x80000000) !== 0,
        depStreamId: dep & 0x7fffffff,
        weight: payload[4] ?? 0,
      };
    }
    case HTTP2_FRAME_TYPE.CONTINUATION:
      return { kind: 'CONTINUATION', streamId, flags, headerBlock: payload };
    default:
      throw new RangeError(`Unsupported HTTP/2 frame type ${type}`);
  }
}

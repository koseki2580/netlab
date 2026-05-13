export const HTTP2_FRAME_TYPE = {
  DATA: 0x0,
  HEADERS: 0x1,
  PRIORITY: 0x2,
  RST_STREAM: 0x3,
  SETTINGS: 0x4,
  PUSH_PROMISE: 0x5,
  PING: 0x6,
  GOAWAY: 0x7,
  WINDOW_UPDATE: 0x8,
  CONTINUATION: 0x9,
} as const;

export const HTTP2_FLAGS = {
  END_STREAM: 0x1,
  ACK: 0x1,
  END_HEADERS: 0x4,
  PADDED: 0x8,
  PRIORITY: 0x20,
} as const;

export interface Http2Setting {
  readonly id: number;
  readonly value: number;
}

export type Http2Frame =
  | {
      readonly kind: 'DATA';
      readonly streamId: number;
      readonly flags: number;
      readonly data: Uint8Array;
    }
  | {
      readonly kind: 'HEADERS';
      readonly streamId: number;
      readonly flags: number;
      readonly headerBlock: Uint8Array;
    }
  | {
      readonly kind: 'SETTINGS';
      readonly flags: number;
      readonly settings: readonly Http2Setting[];
    }
  | { readonly kind: 'WINDOW_UPDATE'; readonly streamId: number; readonly increment: number }
  | { readonly kind: 'PING'; readonly flags: number; readonly opaqueData: Uint8Array }
  | {
      readonly kind: 'GOAWAY';
      readonly lastStreamId: number;
      readonly errorCode: number;
      readonly debugData: Uint8Array;
    }
  | { readonly kind: 'RST_STREAM'; readonly streamId: number; readonly errorCode: number }
  | {
      readonly kind: 'PRIORITY';
      readonly streamId: number;
      readonly exclusive: boolean;
      readonly depStreamId: number;
      readonly weight: number;
    }
  | {
      readonly kind: 'CONTINUATION';
      readonly streamId: number;
      readonly flags: number;
      readonly headerBlock: Uint8Array;
    };

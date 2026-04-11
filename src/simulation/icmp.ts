export const ICMP_TYPE = {
  ECHO_REPLY: 0,
  DESTINATION_UNREACHABLE: 3,
  ECHO_REQUEST: 8,
  TIME_EXCEEDED: 11,
} as const;

export const ICMP_CODE = {
  NET_UNREACHABLE: 0,
  HOST_UNREACHABLE: 1,
  TTL_EXCEEDED_IN_TRANSIT: 0,
} as const;

export type IcmpType = (typeof ICMP_TYPE)[keyof typeof ICMP_TYPE];
export type IcmpCode = (typeof ICMP_CODE)[keyof typeof ICMP_CODE];

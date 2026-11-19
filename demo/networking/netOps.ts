/**
 * The network-operations lesson (REQ-389): four devices send syslog to one
 * collector during one incident. Each line carries the device's own clock, so
 * whether the clocks are NTP-synced decides whether sorting the collected log
 * by timestamp shows what really happened first. A small SNMP part compares
 * polling an interface's status with a linkDown trap for a short flap.
 *
 * Simplified: the messages follow the RFC 5424 layout but leave PROCID, MSGID
 * and structured data empty ("-"); a clock's offset is fixed for the whole
 * incident (real clocks drift); the poller reads only ifOperStatus; network
 * delay to the collector is left out.
 */

export const SEVERITIES = [
  'emerg',
  'alert',
  'crit',
  'err',
  'warning',
  'notice',
  'info',
  'debug',
] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Syslog facility codes (RFC 5424, section 6.2.1) for the facilities used here. */
export const FACILITIES = {
  kern: 0,
  user: 1,
  daemon: 3,
  auth: 4,
  local0: 16,
  local4: 20,
  local7: 23,
} as const;
export type Facility = keyof typeof FACILITIES;

/** PRI = facility × 8 + severity. */
export function pri(facility: Facility, severity: Severity): number {
  return FACILITIES[facility] * 8 + SEVERITIES.indexOf(severity);
}

/** The facility and severity a PRI value carries. */
export function decodePri(value: number): { facilityCode: number; severity: Severity } {
  return { facilityCode: Math.floor(value / 8), severity: SEVERITIES[value % 8]! };
}

export type DeviceId = 'switch' | 'router' | 'firewall' | 'server';

export interface IncidentEvent {
  readonly device: DeviceId;
  readonly hostname: string;
  readonly appName: string;
  readonly facility: Facility;
  readonly severity: Severity;
  /** When it really happened, in seconds after the incident starts. */
  readonly trueSec: number;
  readonly msg: string;
  /** The device's clock error without NTP, in seconds (positive = fast). */
  readonly offsetNoNtpSec: number;
  /** The device's clock error once NTP has synced it, in seconds. */
  readonly offsetNtpSec: number;
}

/** The incident starts at this real (UTC) moment. */
export const INCIDENT_START_MS = Date.UTC(2026, 10, 17, 9, 14, 0);

export const EVENTS: readonly IncidentEvent[] = [
  {
    device: 'switch',
    hostname: 'sw-core1',
    appName: 'ifmgr',
    facility: 'local7',
    severity: 'err',
    trueSec: 0,
    msg: 'Interface Te1/0/49 (uplink) changed state to down',
    offsetNoNtpSec: 180,
    offsetNtpSec: 0.002,
  },
  {
    device: 'router',
    hostname: 'rtr-edge1',
    appName: 'ospfd',
    facility: 'local7',
    severity: 'notice',
    trueSec: 3.4,
    msg: 'OSPF neighbor 10.0.0.1 on Gi0/0 from FULL to DOWN',
    offsetNoNtpSec: -95,
    offsetNtpSec: -0.001,
  },
  {
    device: 'firewall',
    hostname: 'fw1',
    appName: 'fwd',
    facility: 'local4',
    severity: 'warning',
    trueSec: 6.1,
    msg: 'Dropped 312 sessions: no route to 10.20.0.0/16',
    offsetNoNtpSec: 42,
    offsetNtpSec: 0.003,
  },
  {
    device: 'server',
    hostname: 'app1',
    appName: 'orders',
    facility: 'user',
    severity: 'err',
    trueSec: 30,
    msg: 'Timeout after 30 s calling db.internal:5432',
    offsetNoNtpSec: 0,
    offsetNtpSec: -0.002,
  },
];

export type ClockMode = 'no-ntp' | 'ntp';

/** What the device's clock read when the event happened, as ms since the epoch. */
export function deviceTimeMs(event: IncidentEvent, mode: ClockMode): number {
  const offset = mode === 'ntp' ? event.offsetNtpSec : event.offsetNoNtpSec;
  return INCIDENT_START_MS + Math.round((event.trueSec + offset) * 1000);
}

/** RFC 3339 timestamp with milliseconds, in UTC. */
export function timestamp(ms: number): string {
  return new Date(ms).toISOString();
}

/** One collected line: <PRI>1 TIMESTAMP HOSTNAME APP-NAME PROCID MSGID SD MSG. */
export function syslogLine(event: IncidentEvent, mode: ClockMode): string {
  return `<${pri(event.facility, event.severity)}>1 ${timestamp(deviceTimeMs(event, mode))} ${event.hostname} ${event.appName} - - - ${event.msg}`;
}

/** The collected log sorted the way an operator reads it: by the device's timestamp. */
export function sortedByTimestamp(mode: ClockMode): IncidentEvent[] {
  return [...EVENTS].sort((a, b) => deviceTimeMs(a, mode) - deviceTimeMs(b, mode));
}

/** What really happened, in order. */
export function trueOrder(): IncidentEvent[] {
  return [...EVENTS].sort((a, b) => a.trueSec - b.trueSec);
}

/** The largest gap between any two clocks, in seconds. */
export function clockSpreadSec(mode: ClockMode): number {
  const offsets = EVENTS.map((event) =>
    mode === 'ntp' ? event.offsetNtpSec : event.offsetNoNtpSec,
  );
  return Math.max(...offsets) - Math.min(...offsets);
}

/** How a monitor learns that a link went down and came back. */
export interface FlapDetection {
  /** Seconds after the link went down when the monitor first sees it down; null if never. */
  readonly learnsAfterSec: number | null;
}

/**
 * A poller reads ifOperStatus every `intervalSec`; its last poll before the
 * flap was `lastPollBeforeSec` seconds before the link went down. It sees the
 * link down only if a poll lands while the link is down.
 */
export function pollDetection(
  flapSec: number,
  intervalSec: number,
  lastPollBeforeSec: number,
): FlapDetection {
  const nextPoll = intervalSec - lastPollBeforeSec;
  return { learnsAfterSec: nextPoll < flapSec ? nextPoll : null };
}

/** A linkDown trap is sent the moment the interface goes down, whatever the flap's length. */
export function trapDetection(): FlapDetection {
  return { learnsAfterSec: 0 };
}

export const POLL_INTERVAL_SEC = 300;
/** In the lesson the last poll was 4 minutes before the uplink went down. */
export const LAST_POLL_BEFORE_SEC = 240;
export const FLAP_SEC = 40;

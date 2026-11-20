/**
 * The NETCONF/YANG lesson (REQ-400): pushing one interface change to three
 * routers with a data model (NETCONF, RFC 6241; YANG, RFC 7950) and with a
 * CLI script, and what each leaves behind when one value is wrong.
 *
 * Simplified:
 * - The schema is a small slice of ietf-interfaces (RFC 8343) and ietf-ip
 *   (RFC 8344): `description`, `enabled`, `ipv4/mtu` and the `ipv4/address`
 *   list keyed by `ip`. ietf-ip allows an MTU from 68 up; these routers
 *   support up to 9216, as a device would declare with a YANG deviation.
 * - Every check is done in one step at <validate>. A real server may reject
 *   some values already at <edit-config>; either way nothing reaches running.
 * - No <lock>, no sessions, no capabilities exchange. A new address is sent
 *   with nc:operation="create", so an address that already exists is an error
 *   (data-exists) rather than a silent merge.
 * - The CLI is a generic one: each line is applied the moment it is entered,
 *   and the script stops at the first line the router rejects.
 */

export const MTU_MIN = 68;
export const MTU_MAX = 9216;
export const PREFIX_MAX = 32;
/** RFC 6241 §8.4.5: the default <confirm-timeout>, s. */
export const DEFAULT_CONFIRM_TIMEOUT_S = 600;

export interface Address {
  readonly ip: string;
  readonly prefixLength: number;
}

export interface Interface {
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly mtu: number;
  readonly addresses: readonly Address[];
}

export type Config = Readonly<Record<string, Interface>>;

export interface Device {
  readonly name: string;
  readonly running: Config;
}

/** One edit, with its value as text, the way it arrives in XML or on a CLI. */
export type Change =
  | { readonly iface: string; readonly leaf: 'description'; readonly value: string }
  | { readonly iface: string; readonly leaf: 'mtu'; readonly value: string }
  | { readonly iface: string; readonly leaf: 'enabled'; readonly value: string }
  | { readonly iface: string; readonly leaf: 'address'; readonly value: string };

export type ErrorCode =
  | 'not-a-number'
  | 'out-of-range'
  | 'not-boolean'
  | 'bad-address'
  | 'prefix-out-of-range'
  | 'duplicate-address'
  | 'unknown-interface';

export interface RpcError {
  readonly code: ErrorCode;
  /** The NETCONF <error-tag> (RFC 6241 Appendix A). */
  readonly tag: 'invalid-value' | 'data-exists' | 'data-missing';
  /** The <error-path>, an XPath into the data. */
  readonly path: string;
  /** Which change in the change set, from 0. */
  readonly index: number;
}

const ifacePath = (iface: string) => `/interfaces/interface[name='${iface}']`;

function parseAddress(text: string): Address | 'bad-address' | 'prefix-out-of-range' {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,3})$/.exec(text.trim());
  if (!match) return 'bad-address';
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((octet) => octet > 255)) return 'bad-address';
  const prefixLength = Number(match[5]);
  if (prefixLength > PREFIX_MAX) return 'prefix-out-of-range';
  return { ip: octets.join('.'), prefixLength };
}

/**
 * Apply one change to a config, checking it against the schema. Returns the
 * new config, or the error the schema raises for it.
 */
export function applyChange(
  config: Config,
  change: Change,
  index: number,
): { readonly config: Config } | { readonly error: RpcError } {
  const current = config[change.iface];
  const base = ifacePath(change.iface);
  const fail = (code: ErrorCode, tag: RpcError['tag'], path: string) => ({
    error: { code, tag, path, index },
  });
  if (!current) return fail('unknown-interface', 'data-missing', base);
  const put = (next: Interface) => ({ config: { ...config, [change.iface]: next } });
  switch (change.leaf) {
    case 'description':
      return put({ ...current, description: change.value });
    case 'enabled': {
      if (change.value !== 'true' && change.value !== 'false')
        return fail('not-boolean', 'invalid-value', `${base}/enabled`);
      return put({ ...current, enabled: change.value === 'true' });
    }
    case 'mtu': {
      const path = `${base}/ipv4/mtu`;
      if (!/^\d+$/.test(change.value.trim())) return fail('not-a-number', 'invalid-value', path);
      const mtu = Number(change.value.trim());
      if (mtu < MTU_MIN || mtu > MTU_MAX) return fail('out-of-range', 'invalid-value', path);
      return put({ ...current, mtu });
    }
    case 'address': {
      const parsed = parseAddress(change.value);
      if (parsed === 'bad-address' || parsed === 'prefix-out-of-range')
        return fail(parsed, 'invalid-value', `${base}/ipv4/address`);
      const path = `${base}/ipv4/address[ip='${parsed.ip}']`;
      if (current.addresses.some((address) => address.ip === parsed.ip))
        return fail('duplicate-address', 'data-exists', path);
      return put({ ...current, addresses: [...current.addresses, parsed] });
    }
  }
}

export interface NetconfResult {
  /** The candidate after every edit that could be applied. */
  readonly candidate: Config;
  readonly errors: readonly RpcError[];
  readonly committed: boolean;
  readonly running: Config;
}

/**
 * <edit-config> into the candidate, <validate>, then <commit> only if the
 * whole candidate is valid; otherwise <discard-changes>, and running is
 * exactly what it was.
 */
export function netconfPush(running: Config, changes: readonly Change[]): NetconfResult {
  let candidate = running;
  const errors: RpcError[] = [];
  changes.forEach((change, index) => {
    const step = applyChange(candidate, change, index);
    if ('error' in step) errors.push(step.error);
    else candidate = step.config;
  });
  const committed = errors.length === 0;
  return { candidate, errors, committed, running: committed ? candidate : running };
}

export interface CliLine {
  readonly text: string;
  /** Which change the line carries, or null for the `interface` line. */
  readonly index: number | null;
}

/** The CLI lines a script would type for a change set. */
export function cliLines(changes: readonly Change[]): CliLine[] {
  const lines: CliLine[] = [];
  let context: string | null = null;
  changes.forEach((change, index) => {
    if (change.iface !== context) {
      lines.push({ text: `interface ${change.iface}`, index: null });
      context = change.iface;
    }
    const command =
      change.leaf === 'description'
        ? `description ${change.value}`
        : change.leaf === 'mtu'
          ? `ip mtu ${change.value}`
          : change.leaf === 'address'
            ? `ip address ${change.value}`
            : change.value === 'false'
              ? 'shutdown'
              : change.value === 'true'
                ? 'no shutdown'
                : `shutdown ${change.value}`;
    lines.push({ text: ` ${command}`, index });
  });
  return lines;
}

export interface CliResult {
  readonly lines: readonly CliLine[];
  /** How many lines the router accepted before the script stopped. */
  readonly appliedLines: number;
  /** The line the router rejected, from 0, or null when every line went in. */
  readonly failedLine: number | null;
  readonly error: RpcError | null;
  readonly running: Config;
  /** Some changes are in running and some are not. */
  readonly halfConfigured: boolean;
}

/** A CLI script: every accepted line is live at once; it stops at the first rejected line. */
export function cliPush(running: Config, changes: readonly Change[]): CliResult {
  const lines = cliLines(changes);
  let config = running;
  let context: string | null = null;
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at]!;
    if (line.index === null) {
      context = line.text.slice('interface '.length);
      if (!config[context]) {
        const error: RpcError = {
          code: 'unknown-interface',
          tag: 'data-missing',
          path: ifacePath(context),
          index: changes.findIndex((change) => change.iface === context),
        };
        return {
          lines,
          appliedLines: at,
          failedLine: at,
          error,
          running: config,
          halfConfigured: at > 1,
        };
      }
      continue;
    }
    const step = applyChange(config, changes[line.index]!, line.index);
    if ('error' in step) {
      const appliedChanges = lines.slice(0, at).filter((l) => l.index !== null).length;
      return {
        lines,
        appliedLines: at,
        failedLine: at,
        error: step.error,
        running: config,
        halfConfigured: appliedChanges > 0,
      };
    }
    config = step.config;
  }
  return {
    lines,
    appliedLines: lines.length,
    failedLine: null,
    error: null,
    running: config,
    halfConfigured: false,
  };
}

export type Method = 'netconf' | 'netconf-all-or-none' | 'cli';

export interface DeviceOutcome {
  readonly device: string;
  readonly status: 'committed' | 'rejected' | 'aborted' | 'applied' | 'half-applied';
  readonly errors: readonly RpcError[];
  readonly running: Config;
}

/**
 * Push a change set to every device.
 * - `netconf`: each device commits or rejects on its own.
 * - `netconf-all-or-none`: the orchestrator edits and validates every
 *   candidate first, and commits only if all are valid; otherwise it discards
 *   every candidate.
 * - `cli`: a script per device.
 */
export function pushAll(
  devices: readonly Device[],
  changesFor: (device: string) => readonly Change[],
  method: Method,
): DeviceOutcome[] {
  if (method === 'cli') {
    return devices.map((device) => {
      const result = cliPush(device.running, changesFor(device.name));
      return {
        device: device.name,
        status: result.error ? (result.halfConfigured ? 'half-applied' : 'rejected') : 'applied',
        errors: result.error ? [result.error] : [],
        running: result.running,
      };
    });
  }
  const results = devices.map((device) => netconfPush(device.running, changesFor(device.name)));
  const allValid = results.every((result) => result.committed);
  return devices.map((device, at) => {
    const result = results[at]!;
    if (!result.committed)
      return {
        device: device.name,
        status: 'rejected',
        errors: result.errors,
        running: device.running,
      };
    if (method === 'netconf-all-or-none' && !allValid)
      return { device: device.name, status: 'aborted', errors: [], running: device.running };
    return { device: device.name, status: 'committed', errors: [], running: result.running };
  });
}

export interface ConfirmedCommit {
  readonly committed: boolean;
  /** The manager could still reach the device after the commit. */
  readonly reachable: boolean;
  /** When the confirming <commit> arrived, s, or null if it never did in time. */
  readonly confirmedAtS: number | null;
  /** When the device rolled back by itself, s, or null. */
  readonly rolledBackAtS: number | null;
  readonly running: Config;
}

/**
 * A confirmed commit (RFC 6241 §8.4): the change goes live, and unless a
 * confirming <commit> arrives within `timeoutS` the device restores the
 * configuration it had before. The manager reaches the device through
 * `sessionIface`; if the change shuts that interface, the confirmation can
 * never arrive.
 */
export function confirmedCommit(
  running: Config,
  changes: readonly Change[],
  options: {
    readonly timeoutS: number;
    readonly confirmAfterS: number;
    readonly sessionIface: string;
  },
): ConfirmedCommit {
  const push = netconfPush(running, changes);
  if (!push.committed)
    return { committed: false, reachable: true, confirmedAtS: null, rolledBackAtS: null, running };
  const reachable = push.running[options.sessionIface]?.enabled ?? false;
  if (reachable && options.confirmAfterS <= options.timeoutS)
    return {
      committed: true,
      reachable,
      confirmedAtS: options.confirmAfterS,
      rolledBackAtS: null,
      running: push.running,
    };
  return {
    committed: true,
    reachable,
    confirmedAtS: null,
    rolledBackAtS: options.timeoutS,
    running,
  };
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * The <edit-config> RPC for a change set (values as typed, escaped), grouped
 * by interface in the order the interfaces first appear.
 */
export function editConfigXml(changes: readonly Change[], messageId = 101): string {
  const ifaces = [...new Set(changes.map((change) => change.iface))];
  const out: string[] = [
    `<rpc message-id="${messageId}" xmlns="urn:ietf:params:xml:ns:netconf:base:1.0"`,
    '     xmlns:nc="urn:ietf:params:xml:ns:netconf:base:1.0">',
    '  <edit-config>',
    '    <target>',
    '      <candidate/>',
    '    </target>',
    '    <config>',
    '      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">',
  ];
  for (const iface of ifaces) {
    const mine = changes.filter((change) => change.iface === iface);
    out.push('        <interface>', `          <name>${escapeXml(iface)}</name>`);
    for (const change of mine) {
      if (change.leaf === 'description')
        out.push(`          <description>${escapeXml(change.value)}</description>`);
      if (change.leaf === 'enabled')
        out.push(`          <enabled>${escapeXml(change.value)}</enabled>`);
    }
    const ipv4 = mine.filter((change) => change.leaf === 'mtu' || change.leaf === 'address');
    if (ipv4.length > 0) {
      out.push('          <ipv4 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">');
      for (const change of ipv4) {
        if (change.leaf === 'mtu')
          out.push(`            <mtu>${escapeXml(change.value.trim())}</mtu>`);
        else {
          const [ip = '', prefix = ''] = change.value.trim().split('/');
          out.push(
            '            <address nc:operation="create">',
            `              <ip>${escapeXml(ip)}</ip>`,
            `              <prefix-length>${escapeXml(prefix)}</prefix-length>`,
            '            </address>',
          );
        }
      }
      out.push('          </ipv4>');
    }
    out.push('        </interface>');
  }
  out.push('      </interfaces>', '    </config>', '  </edit-config>', '</rpc>');
  return out.join('\n');
}

/** The three routers before the change: eth0 for management, eth1 an uplink. */
export function startingDevices(): Device[] {
  return [1, 2, 3].map((n) => ({
    name: `R${n}`,
    running: {
      eth0: {
        name: 'eth0',
        description: 'management',
        enabled: true,
        mtu: 1500,
        addresses: [{ ip: `192.168.0.${n}`, prefixLength: 24 }],
      },
      eth1: {
        name: 'eth1',
        description: '',
        enabled: true,
        mtu: 1500,
        addresses: [{ ip: `10.0.${n}.1`, prefixLength: 24 }],
      },
    },
  }));
}

/** The change for one router: describe eth1, add a second address, raise the MTU. */
export function uplinkChange(description: string, address: string, mtu: string): Change[] {
  return [
    { iface: 'eth1', leaf: 'description', value: description },
    { iface: 'eth1', leaf: 'address', value: address },
    { iface: 'eth1', leaf: 'mtu', value: mtu },
  ];
}

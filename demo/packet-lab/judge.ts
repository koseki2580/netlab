/**
 * The judge of the packet exercises: one pure async function per kind. None
 * throws; an engine failure is an `engine-error` result.
 *
 * Every verdict is read off the simulator (`facts.ts`), with the README's rules:
 * the learner's packet goes through the pipeline path that forwards it as
 * built; `dstNodeId` is derived from the learner's destination address; the
 * destination MAC is judged by comparing it with the one the simulator
 * resolves itself; a fragment statement is compared with the simulator's own
 * split (the reassembler is used for feedback only).
 */

import type { NetlabNode, TopologySnapshot } from '../../src/types/topology';
import { isInSubnet } from '../../src/utils/cidr';
import { prepare } from '../exercises/grade/prepare';
import {
  buildPacket,
  fragmentsFromStatement,
  reassemble,
  sendPacket,
  type PacketFacts,
  type PacketFields,
  type Transport,
} from './facts';
import { IP_HEADER_BYTES, TRANSPORT_HEADER_BYTES } from './fields';
import type {
  BuildExercise,
  BuildPart,
  FieldId,
  FieldValue,
  FragmentAnswer,
  FragmentExercise,
  FragmentRow,
  Localised,
  PacketEvidence,
  PacketExercise,
  PacketGiven,
  PacketGoal,
  PacketGoalResult,
  PacketGrade,
  PacketResultCode,
  PacketValues,
  ReadAnswer,
  ReadExercise,
  ReadQuestion,
} from './model';
import {
  fragmentMessage,
  join,
  macMessage,
  MESSAGES,
  PICK_MESSAGES,
  REASSEMBLES_ANYWAY,
  type FragmentMistake,
} from './reasons';
import { isCanonicalIpv4, labelIn } from '../exercises/model/text';
import { ownerOf } from '../exercises/grade/engineRun';

type Topology = TopologySnapshot;

interface Context {
  readonly topology: Topology;
  readonly nodeLabels: Readonly<Record<string, Localised>>;
}

const label = (ctx: Context, nodeId: string): Localised => labelIn(ctx.nodeLabels, nodeId);

const result = (
  goalId: string,
  code: PacketResultCode,
  message: Localised,
  evidence?: PacketEvidence,
): PacketGoalResult => ({
  goalId,
  passed: code === 'ok',
  code,
  message,
  ...(evidence ? { evidence } : {}),
});

// --- The topology ----------------------------------------------------------------

/** The node that owns `ip` (`grade/engineRun.ts`), kept here for the judge's callers. */
export { ownerOf };

/** Whether `ip` is on a network some router is connected to (where an unused address bounces: README quirk 2). */
function onConnectedNetwork(topology: Topology, ip: string): boolean {
  return topology.nodes.some((node) =>
    (node.data.interfaces ?? []).some((side) =>
      isInSubnet(ip, `${side.ipAddress}/${side.prefixLength}`),
    ),
  );
}

const isRouter = (topology: Topology, id: string): boolean =>
  topology.nodes.find((node) => node.id === id)?.data.role === 'router';

type MacOwner = NonNullable<PacketEvidence['macOwner']>;

/** Whose MAC this is, and which device it belongs to. */
function macHolder(topology: Topology, mac: string): { node: NetlabNode; side?: string } | null {
  const wanted = mac.toLowerCase();
  for (const node of topology.nodes) {
    if (node.data.mac?.toLowerCase() === wanted) return { node };
    const side = (node.data.interfaces ?? []).find(
      (entry) => entry.macAddress.toLowerCase() === wanted,
    );
    if (side) return { node, side: side.id };
    if ((node.data.ports ?? []).some((entry) => entry.macAddress.toLowerCase() === wanted)) {
      return { node };
    }
  }
  return null;
}

// --- Values onto the packet ---------------------------------------------------------

const MAC = /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i;

export const sizeOf = (packet: PacketGiven): number =>
  IP_HEADER_BYTES + TRANSPORT_HEADER_BYTES[packet.carries] + packet.dataBytes;

function currentValue(packet: PacketGiven, id: FieldId): FieldValue | null {
  switch (id) {
    case 'size':
      return sizeOf(packet);
    default:
      return packet[id];
  }
}

interface Applied {
  readonly packet: PacketGiven;
  readonly problem: {
    readonly code: 'not-filled' | 'invalid-value';
    readonly field: FieldId;
  } | null;
  readonly changed: number;
}

/**
 * The learner's values onto the given packet. Only the exercise's own fields
 * are read: a value for any other field changes nothing.
 */
export function applyValues(part: BuildPart, given: PacketGiven, values: PacketValues): Applied {
  let packet = given;
  let changed = 0;
  for (const entry of part.fields) {
    const raw = values[entry.id];
    const before = currentValue(given, entry.id);
    if (raw === undefined || raw === '') {
      if (before === null)
        return { packet, problem: { code: 'not-filled', field: entry.id }, changed };
      continue;
    }
    const value = typeof raw === 'string' ? raw.trim() : raw;
    const bad = { packet, problem: { code: 'invalid-value' as const, field: entry.id }, changed };
    if (entry.candidates && !entry.candidates.some((option) => option.value === value)) return bad;
    const input = entry.input;
    if (input.kind === 'address' && !(typeof value === 'string' && isCanonicalIpv4(value)))
      return bad;
    if (input.kind === 'mac' && !(typeof value === 'string' && MAC.test(value))) return bad;
    if (input.kind === 'flag' && typeof value !== 'boolean') return bad;
    if (
      input.kind === 'number' &&
      !(Number.isInteger(value) && (value as number) >= input.min && (value as number) <= input.max)
    ) {
      return bad;
    }
    if (input.kind === 'choice' && !input.options.some((option) => option.value === value))
      return bad;
    if (value !== before) changed += 1;
    packet =
      entry.id === 'size'
        ? { ...packet, dataBytes: (value as number) - (sizeOf(packet) - packet.dataBytes) }
        : entry.id === 'dstMac'
          ? { ...packet, dstMac: (value as string).toLowerCase() }
          : ({ ...packet, [entry.id]: value } as PacketGiven);
  }
  return { packet, problem: null, changed };
}

function transportOf(packet: PacketGiven): Transport {
  switch (packet.carries) {
    case 'icmp':
      return { kind: 'icmp-echo', dataBytes: packet.dataBytes };
    case 'tcp':
      return { kind: 'tcp', dstPort: packet.dstPort ?? 0 };
    case 'udp':
      return { kind: 'udp', dstPort: packet.dstPort ?? 0, dataBytes: packet.dataBytes };
  }
}

/** The packet as the simulator takes it, `dstNodeId` derived from the destination address. */
export function toFields(
  topology: Topology,
  packet: PacketGiven,
  dstMac = packet.dstMac,
): PacketFields {
  const dstIp = packet.dstIp ?? '';
  return {
    from: packet.from,
    to: ownerOf(topology, dstIp) ?? dstIp,
    srcIp: packet.srcIp,
    dstIp,
    ...(dstMac !== null ? { dstMac } : {}),
    ttl: packet.ttl ?? 64,
    df: packet.df,
    transport: transportOf(packet),
  };
}

export const send = (topology: Topology, packet: PacketGiven, dstMac = packet.dstMac) =>
  sendPacket(prepare(topology), buildPacket(toFields(topology, packet, dstMac)));

// --- Why a packet did not arrive -------------------------------------------------------

function whyNotThere(
  ctx: Context,
  facts: PacketFacts,
  want: string,
): PacketGoalResult & { id?: never } {
  const path = facts.path;
  if (facts.drop) {
    const { nodeId, reason } = facts.drop;
    const where = label(ctx, nodeId);
    const evidence = (field?: FieldId): PacketEvidence => ({
      nodeId,
      nodeLabel: where,
      dropReason: reason,
      path,
      ...(field ? { field } : {}),
      ...(facts.icmp[0]
        ? {
            icmp: {
              fromNodeId: facts.icmp[0].fromNodeId,
              type: facts.icmp[0].type,
              code: facts.icmp[0].code,
              nextHopMtu: facts.icmp[0].nextHopMtu,
            },
          }
        : {}),
    });
    if (!isRouter(ctx.topology, nodeId)) {
      return result(
        '',
        'handed-to-wrong-device',
        MESSAGES.handedToWrong(where),
        evidence('dstMac'),
      );
    }
    switch (reason) {
      case 'ttl-exceeded': {
        const nth = path.filter((id) => isRouter(ctx.topology, id)).length;
        return result('', 'ttl-ran-out', MESSAGES.ttlRanOut(where, nth), evidence('ttl'));
      }
      case 'acl-deny':
        return result('', 'filter-refused', MESSAGES.filterRefused(where), evidence('dstPort'));
      case 'fragmentation-needed':
        return result('', 'too-big-not-split', MESSAGES.tooBig(where), evidence('df'));
      case 'no-route':
        return result('', 'no-route', MESSAGES.noRoute(where), evidence('dstIp'));
      default:
        return result('', 'engine-error', MESSAGES.engineError, evidence());
    }
  }
  if (facts.deliveredTo && facts.deliveredTo !== want) {
    return result(
      '',
      'delivered-elsewhere',
      MESSAGES.deliveredElsewhere(label(ctx, facts.deliveredTo), label(ctx, want)),
      { nodeId: facts.deliveredTo, nodeLabel: label(ctx, facts.deliveredTo), path },
    );
  }
  return result('', 'engine-error', MESSAGES.engineError, { path });
}

const arrivedTtl = (facts: PacketFacts): number | null =>
  facts.hops.find((hop) => hop.event === 'deliver' && hop.action !== 'reassembly-pending')?.ttl ??
  null;

/** Where the packet should arrive, for goals that do not name it. */
function destinationOf(part: BuildPart, ctx: Context, packet: PacketGiven): string {
  const goal = part.goals.find((entry) => entry.kind === 'delivered');
  if (goal?.kind === 'delivered') return goal.to;
  return ownerOf(ctx.topology, packet.dstIp ?? '') ?? '';
}

// --- build-packet ----------------------------------------------------------------------

interface BuildOutcome {
  readonly results: PacketGoalResult[];
  readonly facts: PacketFacts | null;
}

async function judgePart(
  ctx: Context,
  part: BuildPart,
  given: PacketGiven,
  values: PacketValues,
): Promise<BuildOutcome> {
  const applied = applyValues(part, given, values);
  const all = (code: PacketResultCode, message: Localised, evidence?: PacketEvidence) => ({
    results: part.goals.map((goal) => result(goal.id, code, message, evidence)),
    facts: null,
  });
  if (applied.problem) {
    const { code, field } = applied.problem;
    return all(code, code === 'not-filled' ? MESSAGES.notFilled(field) : MESSAGES.invalid(field), {
      field,
    });
  }
  const packet = applied.packet;
  const dstIp = packet.dstIp ?? '';
  const owner = ownerOf(ctx.topology, dstIp);
  if (owner === packet.from) return all('own-address', MESSAGES.ownAddress, { field: 'dstIp' });
  if (owner === null && onConnectedNetwork(ctx.topology, dstIp)) {
    return all('nobody-has-address', MESSAGES.nobodyHasAddress, { field: 'dstIp' });
  }
  const facts = await send(ctx.topology, packet);
  if (facts.status === 'engine-error') return all('engine-error', MESSAGES.engineError);
  const want = destinationOf(part, ctx, given);

  const results: PacketGoalResult[] = [];
  for (const goal of part.goals) {
    results.push(await judgeGoal(ctx, goal, packet, facts, want, applied.changed));
  }
  return { results, facts };
}

async function judgeGoal(
  ctx: Context,
  goal: PacketGoal,
  packet: PacketGiven,
  facts: PacketFacts,
  want: string,
  changed: number,
): Promise<PacketGoalResult> {
  const ok = () => result(goal.id, 'ok', MESSAGES.ok);
  const why = () => ({ ...whyNotThere(ctx, facts, want), goalId: goal.id });
  const delivered = facts.deliveredTo === want;
  switch (goal.kind) {
    case 'delivered':
      return delivered ? ok() : why();
    case 'ttl-left': {
      if (!delivered) return why();
      const left = arrivedTtl(facts);
      return left === goal.value
        ? ok()
        : result(goal.id, 'ttl-to-spare', MESSAGES.ttlToSpare, {
            field: 'ttl',
            ...(left !== null ? { ttlLeft: left } : {}),
          });
    }
    case 'dropped': {
      const icmpWanted = goal.reason === 'ttl-exceeded' || goal.reason === 'fragmentation-needed';
      if (
        facts.drop?.nodeId === goal.at &&
        facts.drop.reason === goal.reason &&
        (!icmpWanted || facts.icmp[0]?.fromNodeId === goal.at)
      ) {
        const icmp = facts.icmp[0];
        return result(goal.id, 'ok', MESSAGES.ok, {
          nodeId: goal.at,
          nodeLabel: label(ctx, goal.at),
          dropReason: goal.reason,
          ...(icmp
            ? {
                icmp: {
                  fromNodeId: icmp.fromNodeId,
                  type: icmp.type,
                  code: icmp.code,
                  nextHopMtu: icmp.nextHopMtu,
                },
              }
            : {}),
        });
      }
      if (facts.delivered) {
        const message =
          goal.reason === 'fragmentation-needed'
            ? facts.fragments.length > 0
              ? MESSAGES.notDroppedSplit
              : MESSAGES.notDroppedFits
            : MESSAGES.notDropped(label(ctx, facts.deliveredTo ?? ''));
        return result(goal.id, 'not-dropped', message, { path: facts.path, field: 'df' });
      }
      const cause = why();
      return result(
        goal.id,
        'dropped-elsewhere',
        join(MESSAGES.droppedElsewhere, cause.message),
        cause.evidence,
      );
    }
    case 'first-hop-mac': {
      const resolved = await send(ctx.topology, packet, null);
      const right = resolved.hops[0]?.dstMac.toLowerCase();
      if (resolved.status === 'engine-error' || !right) {
        return result(goal.id, 'engine-error', MESSAGES.engineError);
      }
      const written = (packet.dstMac ?? '').toLowerCase();
      if (written === right) return result(goal.id, 'ok', MESSAGES.ok, { macOwner: 'right' });
      const holder = macHolder(ctx.topology, written);
      const sameNetwork = macHolder(ctx.topology, right)?.node.id === want;
      let owner: MacOwner = 'nobody';
      if (holder) {
        const role = holder.node.data.role;
        const side = holder.node.data.interfaces?.find((entry) => entry.id === holder.side);
        if (holder.node.id === want) owner = 'destination';
        else if (holder.node.id === packet.from) owner = 'sender';
        else if (role === 'switch') owner = 'switch';
        else if (role === 'router') {
          const onSenderSide = (entry: { ipAddress: string; prefixLength: number }) =>
            isInSubnet(packet.srcIp, `${entry.ipAddress}/${entry.prefixLength}`);
          owner =
            side && onSenderSide(side)
              ? 'gateway'
              : (holder.node.data.interfaces ?? []).some(onSenderSide)
                ? 'router-far-side'
                : 'other-router';
        } else owner = 'neighbour';
      }
      return result(
        goal.id,
        'wrong-mac',
        macMessage(
          owner,
          holder ? label(ctx, holder.node.id) : null,
          label(ctx, want),
          sameNetwork,
        ),
        {
          field: 'dstMac',
          macOwner: owner,
          ...(holder ? { nodeId: holder.node.id, nodeLabel: label(ctx, holder.node.id) } : {}),
        },
      );
    }
    case 'fragmented':
      if (!delivered) return why();
      return facts.fragments.length > 0 && facts.reassembled
        ? ok()
        : result(goal.id, 'was-not-split', MESSAGES.wasNotSplit, { field: 'df' });
    case 'not-fragmented':
      if (!delivered) return why();
      return facts.fragments.length === 0
        ? ok()
        : result(goal.id, 'was-split', MESSAGES.wasSplit, { field: 'size' });
    case 'largest-whole': {
      if (!delivered) return why();
      if (facts.fragments.length > 0) {
        return result(goal.id, 'was-split', MESSAGES.wasSplit, { field: 'size' });
      }
      const bigger = await send(ctx.topology, { ...packet, dataBytes: packet.dataBytes + 1 });
      if (bigger.status === 'engine-error')
        return result(goal.id, 'engine-error', MESSAGES.engineError);
      return bigger.deliveredTo === want && bigger.fragments.length === 0
        ? result(goal.id, 'not-largest', MESSAGES.notLargest, { field: 'size' })
        : ok();
    }
    case 'max-changes':
      return changed <= goal.max
        ? ok()
        : result(goal.id, 'too-many-changes', MESSAGES.tooManyChanges(changed, goal.max));
  }
}

const graded = (results: readonly PacketGoalResult[], facts: PacketFacts | null): PacketGrade => ({
  passed: results.length > 0 && results.every((entry) => entry.passed),
  results,
  ...(facts?.trace ? { trace: facts.trace } : {}),
});

const failedAll = (ids: readonly string[]): PacketGrade =>
  graded(
    ids.map((id) => result(id, 'engine-error', MESSAGES.engineError)),
    null,
  );

export async function judgeBuild(
  exercise: BuildExercise,
  values: PacketValues,
): Promise<PacketGrade> {
  try {
    const outcome = await judgePart(exercise, exercise, exercise.packet, values);
    return graded(outcome.results, outcome.facts);
  } catch {
    return failedAll(exercise.goals.map((goal) => goal.id));
  }
}

// --- fragment --------------------------------------------------------------------------

/** The simulator's own split of the exercise's packet, in the exercise's units. */
export async function engineSplit(exercise: FragmentExercise): Promise<FragmentRow[] | null> {
  const facts = await send(exercise.topology, { ...exercise.packet, df: false });
  if (facts.status !== 'delivered' || facts.fragments.length === 0) return null;
  return facts.fragments.map((piece) => ({
    size: piece.totalLength,
    ...(exercise.asks.offsets
      ? { offset: exercise.offsetUnit === 'bytes' ? piece.offsetBytes : piece.fragmentOffset }
      : {}),
    ...(exercise.asks.flags ? { mf: piece.mf } : {}),
  }));
}

/** Sizes of a split of `carry` bytes into pieces of at most `room` bytes, each with `header` added. */
const splitSizes = (carry: number, room: number, header: number): number[] => {
  const sizes: number[] = [];
  for (let left = carry; left > 0; left -= room) sizes.push(Math.min(room, left) + header);
  return sizes;
};

const same = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** A mistake the whole list shows, recognised by redoing the split the way the mistake does it. */
function wholeListMistake(
  exercise: FragmentExercise,
  sizes: readonly number[],
): FragmentMistake | null {
  const { mtu, payloadBytes } = exercise;
  const transport = TRANSPORT_HEADER_BYTES[exercise.packet.carries];
  const room = Math.floor((mtu - IP_HEADER_BYTES) / 8) * 8;
  const right = splitSizes(payloadBytes + transport, room, IP_HEADER_BYTES);
  const fits = (other: number[]) => !same(other, right) && same(sizes, other);
  const noHeaderRoom = Math.floor(mtu / 8) * 8;
  for (const carry of [payloadBytes + transport, payloadBytes]) {
    if (
      fits(splitSizes(carry, room, 0)) ||
      fits(splitSizes(carry, noHeaderRoom, 0)) ||
      fits(splitSizes(carry, noHeaderRoom, IP_HEADER_BYTES))
    ) {
      return 'ip-header-forgotten';
    }
  }
  if (fits(splitSizes(payloadBytes, room, IP_HEADER_BYTES))) return 'transport-header-forgotten';
  if (fits(splitSizes(payloadBytes + transport, mtu - IP_HEADER_BYTES, IP_HEADER_BYTES))) {
    return 'not-multiple-of-8';
  }
  return null;
}

const rowsWhere = (count: number, test: (index: number) => boolean): number[] =>
  Array.from({ length: count }, (_, index) => index)
    .filter(test)
    .map((index) => index + 1);

export async function judgeFragment(
  exercise: FragmentExercise,
  answer: FragmentAnswer,
): Promise<PacketGrade> {
  const ids = exercise.goals.map((goal) => goal.id);
  try {
    const truth = await engineSplit(exercise);
    if (!truth) return failedAll(ids);
    const rows = answer.rows;
    const carries = exercise.packet.carries;
    const message = (mistake: FragmentMistake, at: number[] = []) =>
      fragmentMessage(mistake, at, carries);
    const sizes = rows.map((row) => row.size);
    const countRight = rows.length === truth.length;
    const listMistake = wholeListMistake(exercise, sizes);
    const out: PacketGoalResult[] = [];
    const ok = (id: FragmentExercise['goals'][number]['id']) => result(id, 'ok', MESSAGES.ok);

    for (const goal of exercise.goals) {
      if (goal.id === 'count') {
        const mistake = countRight ? null : (listMistake ?? 'wrong-count');
        out.push(mistake ? result('count', mistake, message(mistake)) : ok('count'));
        continue;
      }
      if (goal.id === 'sizes') {
        const wrong = rowsWhere(rows.length, (index) => sizes[index] !== truth[index]?.size);
        if (countRight && wrong.length === 0) {
          out.push(ok('sizes'));
          continue;
        }
        const notEight = rowsWhere(
          rows.length - 1,
          (index) => ((sizes[index] ?? 0) - IP_HEADER_BYTES) % 8 !== 0,
        );
        const over = rowsWhere(rows.length, (index) => (sizes[index] ?? 0) > exercise.mtu);
        const mistake: FragmentMistake =
          listMistake ??
          (notEight.length > 0
            ? 'not-multiple-of-8'
            : over.length > 0
              ? 'over-mtu'
              : 'wrong-sizes');
        const at =
          mistake === 'not-multiple-of-8' ? notEight : mistake === 'over-mtu' ? over : wrong;
        let text = message(mistake, at);
        let reassembles: boolean | undefined;
        if (exercise.asks.offsets && exercise.asks.flags && mistake === 'wrong-sizes') {
          reassembles = statementReassembles(exercise, rows);
          if (reassembles) text = join(text, REASSEMBLES_ANYWAY);
        }
        out.push(
          result('sizes', mistake, text, {
            rows: at,
            ...(reassembles !== undefined ? { reassembles } : {}),
          }),
        );
        continue;
      }
      if (goal.id === 'offsets') {
        const offsets = rows.map((row) => row.offset);
        const wrong = rowsWhere(rows.length, (index) => offsets[index] !== truth[index]?.offset);
        if (countRight && wrong.length === 0) {
          out.push(ok('offsets'));
          continue;
        }
        const scale = exercise.offsetUnit === 'bytes' ? 1 / 8 : 8;
        const otherUnit =
          truth.some((row) => (row.offset ?? 0) > 0) &&
          offsets.length === truth.length &&
          offsets.every((offset, index) => offset === (truth[index]?.offset ?? 0) * scale);
        const mistake: FragmentMistake = otherUnit
          ? exercise.offsetUnit === 'bytes'
            ? 'offsets-in-units'
            : 'offsets-in-bytes'
          : 'wrong-offsets';
        out.push(result('offsets', mistake, message(mistake, wrong), { rows: wrong }));
        continue;
      }
      // flags
      const last = rows.length - 1;
      const onLast = rows[last]?.mf === true;
      const clearedMiddle = rowsWhere(last, (index) => rows[index]?.mf !== true);
      if (countRight && !onLast && clearedMiddle.length === 0 && rows.length > 0) {
        out.push(ok('flags'));
      } else if (onLast) {
        out.push(result('flags', 'mf-on-last', message('mf-on-last'), { rows: [last + 1] }));
      } else if (clearedMiddle.length > 0) {
        out.push(
          result('flags', 'mf-cleared-middle', message('mf-cleared-middle', clearedMiddle), {
            rows: clearedMiddle,
          }),
        );
      } else {
        out.push(result('flags', 'wrong-count', message('wrong-count')));
      }
    }
    const passed = out.every((entry) => entry.passed);
    // Replaying the real split shows the answer: only once it is solved.
    const facts = passed ? await send(exercise.topology, exercise.packet) : null;
    return graded(out, facts);
  } catch {
    return failedAll(ids);
  }
}

/** The engine's reassembler as a second opinion: do these pieces fit back together at all? */
function statementReassembles(exercise: FragmentExercise, rows: readonly FragmentRow[]): boolean {
  const unit = exercise.offsetUnit === 'bytes' ? 8 : 1;
  if (rows.some((row) => row.offset === undefined || row.offset % unit !== 0)) return false;
  const whole = buildPacket(toFields(exercise.topology, exercise.packet));
  const pieces = rows.map((row) => ({
    fragmentOffset: (row.offset ?? 0) / unit,
    payloadBytes: row.size - IP_HEADER_BYTES,
    mf: row.mf ?? false,
  }));
  return reassemble(fragmentsFromStatement(whole, pieces)) !== null;
}

// --- read-packet -----------------------------------------------------------------------

/** The field that made the device drop the packet, read off the simulator. */
function causeOf(topology: Topology, packet: PacketGiven, facts: PacketFacts): string {
  switch (facts.drop?.reason) {
    case 'ttl-exceeded':
      return 'ttl';
    case 'fragmentation-needed':
      return 'df';
    case 'no-route':
      return 'dstIp';
    case 'acl-deny': {
      const node = topology.nodes.find((entry) => entry.id === facts.drop?.nodeId);
      const rules = (node?.data.interfaces ?? []).flatMap((side) => side.inboundAcl ?? []);
      const kindFits = rules.some(
        (rule) =>
          rule.action === 'permit' && (rule.protocol === 'any' || rule.protocol === packet.carries),
      );
      return kindFits ? 'dstPort' : 'carries';
    }
    default:
      return 'none';
  }
}

/** What the right answer to `question` is, according to the simulator. */
export async function truthOf(exercise: ReadExercise, question: ReadQuestion): Promise<string> {
  const [first, second] = exercise.packets;
  if (!first) return '';
  const facts = await send(exercise.topology, first);
  switch (question.ask) {
    case 'arrives-at':
      return facts.deliveredTo ?? 'nowhere';
    case 'stops-at':
      return facts.drop?.nodeId ?? facts.deliveredTo ?? '';
    case 'cause':
      return causeOf(exercise.topology, first, facts);
    case 'cut-by':
      return facts.fragments[0]?.nodeId ?? 'none';
    case 'frame-src-mac':
    case 'frame-dst-mac':
    case 'ttl-on-link': {
      const hop = facts.hops.find((entry) => entry.hop.activeEdgeId === question.edgeId);
      if (!hop) return '';
      return question.ask === 'ttl-on-link'
        ? String(hop.ttl)
        : question.ask === 'frame-src-mac'
          ? hop.srcMac.toLowerCase()
          : hop.dstMac.toLowerCase();
    }
    case 'which-arrive': {
      const other = second ? await send(exercise.topology, second) : null;
      const a = facts.delivered && facts.deliveredTo === ownerOf(exercise.topology, first.dstIp);
      const b =
        other?.delivered === true &&
        other.deliveredTo === ownerOf(exercise.topology, second?.dstIp ?? '');
      return a && b ? 'both' : a ? 'a' : b ? 'b' : 'neither';
    }
  }
}

const READ_WRONG: Record<ReadQuestion['ask'], Localised> = {
  'cut-by': {
    en: 'It is not cut there. At each router, compare the size of the packet with the MTU of the cable ahead.',
    ja: 'そこでは分割されません。ルータごとに、パケットの大きさと、その先の回線の MTU を比べてください。',
  },
  'frame-src-mac': {
    en: "That is not the frame's sender on this cable. It is the device that sent the frame onto this cable, by the side facing it.",
    ja: 'この回線でのフレームの送り主ではありません。送り主 MAC は、この回線へフレームを送り出した機器の、この回線側の MAC です。',
  },
  'frame-dst-mac': {
    en: 'That is not who takes the frame on this cable. It is the next device that takes it: a router or the destination; a switch does not count.',
    ja: 'この回線でフレームを受け取るのは、その機器ではありません。あて先 MAC は、次に受け取る機器（ルータかあて先）の MAC です。スイッチは数えません。',
  },
  'ttl-on-link': {
    en: 'That is not its TTL on this cable. Count the routers it has crossed to get here.',
    ja: 'この回線での TTL はちがいます。ここまでに越えたルータの数を数えてください。',
  },
  'arrives-at': {
    en: 'Not there. Compare its destination address with the address of each device on the diagram.',
    ja: 'そこではありません。あて先アドレスを、図の機器のアドレスと 1 つずつ見比べてください。',
  },
  'which-arrive': {
    en: 'Not so. For each packet, check whether some device on the diagram has its destination address.',
    ja: 'ちがいます。パケットごとに、あて先アドレスを持つ機器が図にあるかを確かめてください。',
  },
  'stops-at': {
    en: 'It does not stop there. Follow it router by router, and at each one check the TTL left, the cable ahead and the list (ACL).',
    ja: 'そこでは止まりません。ルータを 1 台ずつたどり、それぞれで TTL の残り・先の回線・一覧（ACL）を確かめてください。',
  },
  cause: {
    en: 'That field is not why it was dropped. At the device where it stopped, check whether that value really is a problem there.',
    ja: '捨てられた理由は、その欄ではありません。止まった機器で、その欄の値が本当に問題になるかを確かめてください。',
  },
};

export async function judgeRead(exercise: ReadExercise, answer: ReadAnswer): Promise<PacketGrade> {
  const ids = [
    ...exercise.questions.map((question) => question.id),
    ...(exercise.fix?.goals.map((goal) => goal.id) ?? []),
  ];
  try {
    const out: PacketGoalResult[] = [];
    for (const question of exercise.questions) {
      const pick = answer.picks[question.id];
      const truth = await truthOf(exercise, question);
      if (pick === undefined) out.push(result(question.id, 'no-pick', MESSAGES.noPick));
      else if (pick === truth) out.push(result(question.id, 'ok', MESSAGES.ok));
      else {
        // The mistake the chosen candidate is, where there are words for it; else the question's.
        const why = question.candidates.find((candidate) => String(candidate.value) === pick)?.why;
        out.push(
          result(
            question.id,
            'wrong-pick',
            (why && PICK_MESSAGES[why]) || READ_WRONG[question.ask],
          ),
        );
      }
    }
    const [first] = exercise.packets;
    if (!first) return failedAll(ids);
    if (exercise.fix) {
      const outcome = await judgePart(exercise, exercise.fix, first, answer.values ?? {});
      return graded(
        [...out, ...outcome.results],
        outcome.facts ?? (await send(exercise.topology, first)),
      );
    }
    return graded(out, await send(exercise.topology, first));
  } catch {
    return failedAll(ids);
  }
}

// --- Any kind ---------------------------------------------------------------------------

export type PacketAnswer =
  | { readonly kind: 'build-packet'; readonly values: PacketValues }
  | { readonly kind: 'fragment'; readonly answer: FragmentAnswer }
  | { readonly kind: 'read-packet'; readonly answer: ReadAnswer };

export function judgePacketExercise(
  exercise: PacketExercise,
  answer: PacketAnswer,
): Promise<PacketGrade> {
  if (exercise.kind === 'build-packet' && answer.kind === 'build-packet')
    return judgeBuild(exercise, answer.values);
  if (exercise.kind === 'fragment' && answer.kind === 'fragment')
    return judgeFragment(exercise, answer.answer);
  if (exercise.kind === 'read-packet' && answer.kind === 'read-packet')
    return judgeRead(exercise, answer.answer);
  return Promise.resolve(graded([], null));
}

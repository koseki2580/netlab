/**
 * Three hand-built exercises, so the pages can be developed and tested before
 * the templates exist: the plan's three worked examples, the same ones
 * `grade/gradeExercise.test.ts` grades end to end.
 *
 * `exerciseSource.ts` uses these only when the templates module has nothing
 * for an id or a level. Every seed gives the same task; only the id differs.
 */

import type { TopologySnapshot } from '../../src/types/topology';
import type { Exercise, ExerciseTemplate, SettingRef } from './model/types';
import {
  host,
  iface,
  lanBehindRouter,
  link,
  router,
  snapshot,
  vlanSwitch,
  withNodeData,
  withPort,
} from './templates/shared/build';

function place(
  topology: TopologySnapshot,
  positions: Readonly<Record<string, readonly [number, number]>>,
): TopologySnapshot {
  return {
    ...topology,
    nodes: topology.nodes.map((node) => {
      const at = positions[node.id];
      return at ? { ...node, position: { x: at[0], y: at[1] } } : node;
    }),
  };
}

function relabel(topology: TopologySnapshot, labels: Readonly<Record<string, string>>) {
  return Object.entries(labels).reduce(
    (current, [nodeId, label]) => withNodeData(current, nodeId, { label }),
    topology,
  );
}

type Task = Omit<Exercise, 'id' | 'seed' | 'templateId' | 'generatorVersion'>;

function template(id: string, task: Task): ExerciseTemplate {
  return {
    id,
    level: task.level,
    kind: task.kind,
    title: task.title,
    generatorVersion: 1,
    generate: (seed) => ({
      ...task,
      id: `${id}~${seed}`,
      templateId: id,
      seed,
      generatorVersion: 1,
    }),
  };
}

// --- 1. The till with the wrong address --------------------------------------

const TILL: Task = {
  level: 1,
  kind: 'configure',
  title: { en: 'The till cannot reach the stock server', ja: 'レジが在庫サーバにつながらない' },
  brief: {
    en: 'The till cannot reach the stock server. Its address does not fit the shop network. Give the till an address that fits.',
    ja: 'レジから在庫サーバに届きません。レジのアドレスが、お店のネットワークに合っていません。合うアドレスに直してください。',
  },
  start: place(
    relabel(withNodeData(lanBehindRouter(), 'pc1', { ip: '192.168.2.50' }), {
      pc1: 'レジ',
      pc2: '事務PC',
      sw1: 'スイッチ',
      r1: 'ルータ',
      srv: '在庫サーバ',
    }),
    { pc1: [0, 0], pc2: [0, 150], sw1: [190, 75], r1: [380, 75], srv: [570, 75] },
  ),
  allowed: [{ kind: 'host-ip', nodeId: 'pc1' }],
  checks: [
    { id: 'till', kind: 'reach', probe: { via: 'ping', from: 'pc1', to: 'srv' } },
    { id: 'other-pc', kind: 'reach', probe: { via: 'ping', from: 'pc2', to: 'srv' } },
  ],
  hints: [
    {
      tier: 1,
      text: {
        en: 'Compare the address of the till with the address of the office PC next to it.',
        ja: 'レジのアドレスと、となりの事務PCのアドレスを見くらべてください。',
      },
    },
    {
      tier: 2,
      text: {
        en: 'Devices on one network share the first three numbers. The office PC starts with 192.168.1; the till starts with 192.168.2.',
        ja: '同じネットワークの機器は、最初の 3 つの数が同じです。事務PCは 192.168.1 で始まりますが、レジは 192.168.2 で始まっています。',
      },
    },
    {
      tier: 3,
      text: {
        en: 'Give the till an address that starts with 192.168.1 and that nobody else uses, such as 192.168.1.20.',
        ja: 'レジのアドレスを、192.168.1 で始まり、ほかの機器が使っていないもの（たとえば 192.168.1.20）にしてください。',
      },
    },
  ],
  lessons: ['/course', '/learning/subnetting'],
  reference: [{ kind: 'host-ip', nodeId: 'pc1', ip: '192.168.1.20' }],
  fingerprint: 'dev:till',
};

// --- 2. One switch, two departments ------------------------------------------

const VLAN_PORTS: SettingRef[] = ['p1', 'p2', 'p3', 'p4'].map((portId) => ({
  kind: 'port-vlan',
  nodeId: 'sw1',
  portId,
}));

const VLAN_SPLIT: Task = {
  level: 2,
  kind: 'switch',
  title: { en: 'Keep sales and accounting apart', ja: '営業と経理を分ける' },
  brief: {
    en: 'Sales and accounting share one switch, and every PC can reach every other. Split the switch so that sales PCs reach each other, accounting PCs reach each other, and the two departments do not reach each other.',
    ja: '営業と経理が 1 台のスイッチを使っていて、どの PC からも全部の PC に届いてしまいます。営業どうし、経理どうしは届き、営業と経理のあいだは届かないように、スイッチを分けてください。',
  },
  start: place(
    relabel(
      withPort(withPort(vlanSwitch(), 'sw1', 'p3', { accessVlan: 10 }), 'sw1', 'p4', {
        accessVlan: 10,
      }),
      { a1: '営業1', a2: '営業2', b1: '経理1', b2: '経理2', sw1: 'スイッチ' },
    ),
    { a1: [0, 0], a2: [0, 150], sw1: [220, 75], b1: [440, 0], b2: [440, 150] },
  ),
  allowed: VLAN_PORTS,
  checks: [
    { id: 'sales', kind: 'reach', probe: { via: 'ping', from: 'a1', to: 'a2' } },
    { id: 'accounting', kind: 'reach', probe: { via: 'ping', from: 'b1', to: 'b2' } },
    {
      id: 'apart-1',
      kind: 'must-not-reach',
      probe: { via: 'ping', from: 'a1', to: 'b1' },
      because: 'vlan',
    },
    {
      id: 'apart-2',
      kind: 'must-not-reach',
      probe: { via: 'ping', from: 'b2', to: 'a2' },
      because: 'vlan',
    },
  ],
  hints: [
    {
      tier: 1,
      text: {
        en: 'Look at the group (VLAN) number of each port of the switch.',
        ja: 'スイッチの差し込み口ごとの、グループ（VLAN）の番号を見てください。',
      },
    },
    {
      tier: 2,
      text: {
        en: 'All four ports are in VLAN 10, so the switch treats them as one group.',
        ja: '4 つの差し込み口がすべて VLAN 10 なので、スイッチは全部を 1 つのグループとして扱っています。',
      },
    },
    {
      tier: 3,
      text: {
        en: 'Put the two accounting ports in another VLAN, for example 20, and leave the sales ports in 10.',
        ja: '経理の 2 つの差し込み口を別の VLAN（たとえば 20）にして、営業の差し込み口は 10 のままにしてください。',
      },
    },
  ],
  lessons: ['/networking/vlan'],
  reference: [
    { kind: 'port-vlan', nodeId: 'sw1', portId: 'p3', vlanMode: 'access', accessVlan: 20 },
    { kind: 'port-vlan', nodeId: 'sw1', portId: 'p4', vlanMode: 'access', accessVlan: 20 },
  ],
  fingerprint: 'dev:vlan-split',
};

// --- 3. Which design takes the fast path -------------------------------------

const NETS = {
  office: '10.0.1.0/24',
  slow: '10.0.12.0/30',
  fast1: '10.0.13.0/30',
  fast2: '10.0.32.0/30',
  branch: '10.0.2.0/24',
};

const OSPF_NETWORKS: Readonly<Record<string, readonly string[]>> = {
  r1: [NETS.office, NETS.slow, NETS.fast1],
  r3: [NETS.fast1, NETS.fast2],
  r2: [NETS.slow, NETS.fast2, NETS.branch],
};

const FAST_PATH_START = Object.entries(OSPF_NETWORKS).reduce(
  (topology, [nodeId, networks], index) =>
    withNodeData(topology, nodeId, {
      ospfConfig: {
        routerId: `${index + 1}.${index + 1}.${index + 1}.${index + 1}`,
        areas: networks.map((network) => ({ areaId: '0.0.0.0', networks: [network] })),
      },
    }),
  snapshot(
    [
      host('pc', '10.0.1.10', { label: '本社PC', x: 0, y: 150 }),
      router(
        'r1',
        [iface('lan', '10.0.1.1/24'), iface('slow', '10.0.12.1/30'), iface('fast', '10.0.13.1/30')],
        {},
        { label: '本社ルータ', x: 180, y: 150 },
      ),
      router(
        'r3',
        [iface('to-r1', '10.0.13.2/30'), iface('to-r2', '10.0.32.1/30')],
        {},
        { label: '光回線ルータ', x: 330, y: 0 },
      ),
      router(
        'r2',
        [iface('slow', '10.0.12.2/30'), iface('fast', '10.0.32.2/30'), iface('lan', '10.0.2.1/24')],
        {},
        { label: '支店ルータ', x: 480, y: 150 },
      ),
      host('srv', '10.0.2.10', { role: 'server', label: '支店サーバ', x: 660, y: 150 }),
    ],
    [
      link('e-pc', 'pc', 'r1:lan'),
      link('e-slow', 'r1:slow', 'r2:slow'),
      link('e-fast1', 'r1:fast', 'r3:to-r1'),
      link('e-fast2', 'r3:to-r2', 'r2:fast'),
      link('e-srv', 'r2:lan', 'srv'),
    ],
  ),
);

const FAST_PATH: Task = {
  level: 3,
  kind: 'choose-design',
  title: { en: 'Send traffic over the fast line', ja: '速い回線を通す設計を選ぶ' },
  brief: {
    en: 'Head office and the branch are joined twice: directly by an old slow line, and through the fibre router by two fast lines. Choose the design that sends head-office traffic to the branch server over the fibre router.',
    ja: '本社と支店は 2 通りにつながっています。古くて遅い直通の回線と、光回線ルータを通る速い回線です。本社PCから支店サーバへの通信が、光回線ルータを通るようになる設計を選んでください。',
  },
  start: FAST_PATH_START,
  allowed: [
    { kind: 'ospf-cost', nodeId: 'r1', network: NETS.slow },
    { kind: 'ospf-cost', nodeId: 'r2', network: NETS.slow },
    { kind: 'ospf-cost', nodeId: 'r1', network: NETS.fast1 },
    { kind: 'ospf-cost', nodeId: 'r3', network: NETS.fast2 },
  ],
  options: [
    {
      id: 'equal',
      label: { en: 'Leave every line at the same cost', ja: 'どの回線も同じコストのままにする' },
      changes: [],
    },
    {
      id: 'slow-high',
      label: { en: 'Raise the cost of the slow direct line', ja: '遅い直通回線のコストを高くする' },
      changes: [
        { kind: 'ospf-cost', nodeId: 'r1', network: NETS.slow, cost: 50 },
        { kind: 'ospf-cost', nodeId: 'r2', network: NETS.slow, cost: 50 },
      ],
    },
    {
      id: 'fast-high',
      label: { en: 'Raise the cost of the fast lines', ja: '速い回線のコストを高くする' },
      changes: [
        { kind: 'ospf-cost', nodeId: 'r1', network: NETS.fast1, cost: 50 },
        { kind: 'ospf-cost', nodeId: 'r3', network: NETS.fast2, cost: 50 },
      ],
    },
  ],
  checks: [
    { id: 'arrives', kind: 'reach', probe: { via: 'ping', from: 'pc', to: 'srv' } },
    { id: 'fast', kind: 'path-via', probe: { via: 'ping', from: 'pc', to: 'srv' }, nodeId: 'r3' },
  ],
  hints: [
    {
      tier: 1,
      text: {
        en: 'OSPF adds up the cost of each line on the way and takes the smallest total.',
        ja: 'OSPF は、通る回線のコストを足して、合計がいちばん小さい道を選びます。',
      },
    },
    {
      tier: 2,
      text: {
        en: 'With equal costs the direct line is one line and the fibre path is two, so the direct line wins.',
        ja: 'コストが同じだと、直通は回線 1 本、光回線は 2 本なので、直通が選ばれます。',
      },
    },
    {
      tier: 3,
      text: {
        en: 'Make the slow direct line cost more than the two fast lines together.',
        ja: '遅い直通回線のコストを、速い回線 2 本の合計より高くしてください。',
      },
    },
  ],
  lessons: ['/routing/ospf-convergence'],
  reference: [
    { kind: 'ospf-cost', nodeId: 'r1', network: NETS.slow, cost: 50 },
    { kind: 'ospf-cost', nodeId: 'r2', network: NETS.slow, cost: 50 },
  ],
  fingerprint: 'dev:fast-path',
};

export const DEV_TILL_ID = 'dev-l1-host-address';
export const DEV_VLAN_ID = 'dev-l2-vlan-separate';
export const DEV_DESIGN_ID = 'dev-l3-choose-fast-path';

export const FIXTURE_TEMPLATES: readonly ExerciseTemplate[] = [
  template(DEV_TILL_ID, TILL),
  template(DEV_VLAN_ID, VLAN_SPLIT),
  template(DEV_DESIGN_ID, FAST_PATH),
];

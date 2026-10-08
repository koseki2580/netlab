/**
 * Why a check passed or failed, in a beginner's words, in both languages.
 *
 * Every message is two short sentences: what was observed, then what to look
 * at. (A reply that got lost has one more in front, saying that the request did
 * arrive.) Where the grader could read the cause off the topology, the message
 * IS that cause (`diagnosisMessage`), because then the first sentence is also
 * the thing to act on. A term the learner may not know comes with a gloss.
 * Device names are labels (what the diagram shows), never ids. Nothing here
 * quotes the label of a button: the page may word its controls differently.
 */

import type { CheckResultCode, Localised } from '../model/types';

type Leg = 'request' | 'reply';

const join = (first: Localised, second: Localised): Localised => ({
  en: `${first.en} ${second.en}`,
  ja: `${first.ja}${second.ja}`,
});

// --- Causes read off the topology ------------------------------------------------

export type DiagnosisDetail =
  | { readonly kind: 'cable-down' }
  | {
      readonly kind: 'duplicate-address';
      readonly address: string;
      /** Labels of two devices holding it: the one the check is about (or the one changed) first. */
      readonly holder: string;
      readonly other: string;
      /** The learner gave `holder` this address; `other` had it from the start. */
      readonly chosen: boolean;
    }
  | {
      readonly kind: 'wrong-network';
      readonly address: string;
      /** The label of the one device whose address does not match its neighbours'. */
      readonly device: string;
      /** For a router: which of its sides, as the settings form names it. */
      readonly side?: Localised;
    };

const CABLE_DOWN: Localised = {
  en: 'A cable is unplugged. Look for the red dotted line.',
  ja: 'ケーブルがぬけています。赤い点線をさがしてください。',
};

/** The message of a failure whose cause the grader read off the topology. */
export function diagnosisMessage(detail: DiagnosisDetail): Localised {
  switch (detail.kind) {
    case 'cable-down':
      return CABLE_DOWN;
    case 'duplicate-address':
      return detail.chosen
        ? {
            en: `This address (${detail.address}) is already used by ${detail.other}. Choose another number.`,
            ja: `このアドレス（${detail.address}）は、${detail.other}がもう使っています。べつの数字をえらんでください。`,
          }
        : {
            en: `${detail.holder} and ${detail.other} use the same address (${detail.address}). Give one of them another number.`,
            ja: `${detail.holder}と${detail.other}が、同じアドレス（${detail.address}）を使っています。どちらかを、べつの数字にしてください。`,
          };
    case 'wrong-network':
      return detail.side
        ? {
            en: `The first numbers do not match the devices around it. Look at the address of ${detail.device} on the ${detail.side.en} (${detail.address}).`,
            ja: `はじめの数字が、まわりの機器とちがいます。${detail.device}の「${detail.side.ja}」のアドレス（${detail.address}）を見てください。`,
          }
        : {
            en: `The first numbers do not match the devices around it. Compare the address of ${detail.device} (${detail.address}) with its neighbours.`,
            ja: `はじめの数字が、まわりの機器とちがいます。${detail.device}のアドレス（${detail.address}）を、となりの機器と見くらべてください。`,
          };
  }
}

// --- Drop reasons --------------------------------------------------------------

/** Said first when the request arrived and the answer got lost. A lost request needs no sentence: the goal says so. */
const REPLY_LOST: Localised = {
  en: 'The request arrived, but the reply did not come back.',
  ja: '相手には届きましたが、返事が戻りませんでした。',
};

/** What a `no-route` message may say, beyond the reason itself. */
export interface DropContext {
  /**
   * The exercise lets the learner write routes. Then a missing route is the
   * thing to look at; otherwise it is an address (a level 1 learner has no
   * routes to look at).
   */
  readonly routesEditable?: boolean;
}

/**
 * One entry per drop reason the engine reports. `device` is the label of the
 * node that reported the drop.
 *
 * `no-route` must NOT use it: a frame nobody can deliver is flooded, and the
 * drop is then often reported by a bystander host (engineContract facts 4, 5).
 * For an ACL, a VLAN or a spanning-tree drop the reporting device is the one
 * that stopped the packet, so naming it is accurate.
 */
const DROP_TEXT = {
  'no-route': (_device, leg, context) =>
    context.routesEditable === true
      ? leg === 'request'
        ? {
            en: "A router on the way did not know a path to the destination. In its routes, look at the destination's network and at the router it is handed to.",
            ja: 'とちゅうのルータが、行き先への道を知りませんでした。ルータの経路で、行き先のネットワークと渡す相手を見てください。',
          }
        : {
            en: "A router on the way back did not know a path to the sender. In the routes of the routers on the far side, look at the sender's network and at the router it is handed to.",
            ja: '帰り道のルータが、送り主への道を知りませんでした。相手側のルータの経路で、送り主のネットワークと渡す相手を見てください。',
          }
      : leg === 'request'
        ? {
            en: 'A device on the way could not find the destination. Compare the first numbers of each address with the devices next to it.',
            ja: 'とちゅうの機器が、行き先を見つけられませんでした。アドレスのはじめの数字を、となりの機器と見くらべてください。',
          }
        : {
            en: "A device on the way back could not find the sender. Compare the sender's address with the devices next to it.",
            ja: '帰り道の機器が、送り主を見つけられませんでした。送り主のアドレスを、となりの機器と見くらべてください。',
          },
  'acl-deny': (device, leg) => ({
    en:
      `${device} refused it. Check that its list of allowed traffic (ACL) has a line that lets this through.` +
      (leg === 'reply' ? ' Replies are checked against the list too.' : ''),
    ja:
      `${device} が通しませんでした。${device} の「通してよい通信の一覧（ACL）」に、これを通す行があるか見てください。` +
      (leg === 'reply' ? '返事も、この一覧で調べられます。' : ''),
  }),
  'no-egress-in-vlan': (device) => ({
    en: `${device} had no port with the same VLAN number to send it out of. Compare the VLAN numbers of the two ports, and the list on the link between switches.`,
    ja: `${device} には、同じ VLAN 番号の出口がありませんでした。2 台の差し込み口の VLAN 番号と、スイッチ同士をつなぐ線の一覧を見くらべてください。`,
  }),
  'vlan-ingress-violation': (device) => ({
    en: `${device} did not accept it on the port it came in on. Look at the VLAN setting of that port.`,
    ja: `${device} は、入ってきた差し込み口でこれを受け取りませんでした。その差し込み口の VLAN の設定を見てください。`,
  }),
  'stp-port-blocked': (device) => ({
    en: `${device} keeps that port closed, so that traffic cannot circle in a ring of switches (spanning tree). Look for another way round that is open.`,
    ja: `${device} は、輪になった配線で通信が回り続けないように、その差し込み口を止めています（スパニングツリー）。別の道が開いているか見てください。`,
  }),
  'link-failed': () => CABLE_DOWN,
  'node-down': (device) => ({
    en: `${device} is switched off. Look for a path that does not pass through it.`,
    ja: `${device} の電源が入っていません。${device} を通らない道があるか見てください。`,
  }),
  'interface-down': (device) => ({
    en: `A port on ${device} is switched off. Look at which port the path uses.`,
    ja: `${device} の差し込み口が止まっています。道がどの差し込み口を使うか見てください。`,
  }),
  'ttl-exceeded': () => ({
    en: 'It was passed along too many times and thrown away (a packet may only be passed on so often). Check that no two routers send it back to each other.',
    ja: '何度も中継されて、捨てられました（中継できる回数には上限があります）。2 台のルータが、お互いに送り返していないか見てください。',
  }),
  'routing-loop': () => ({
    en: 'It went round in a circle between devices. Check that no two devices use the same address, and that no two point at each other.',
    ja: '機器のあいだを、ぐるぐる回りました。同じアドレスの機器が 2 台ないか、2 台がお互いを行き先にしていないか見てください。',
  }),
  'no-nat-entry': (device) => ({
    en: `${device} rewrites addresses (NAT) and had no record of this conversation. Check which side of ${device} is marked inside and which outside.`,
    ja: `${device} には、この通信のアドレスの書きかえ（NAT）の記録がありませんでした。${device} のどちら側が「内側」で、どちら側が「外側」かを見てください。`,
  }),
  'nat-port-exhausted': (device) => ({
    en: `${device} rewrites addresses (NAT) and ran out of free port numbers. Too many conversations are open through it at once.`,
    ja: `${device} のアドレスの書きかえ（NAT）で使える番号が、残っていませんでした。同時に開いている通信が多すぎます。`,
  }),
  'fragmentation-needed': () => ({
    en: 'It was too big for a link on the way and was not allowed to be split. Check the size limit (MTU) of the links.',
    ja: 'とちゅうの線には大きすぎて、分けることも許されていませんでした。線ごとの大きさの上限（MTU）を見てください。',
  }),
  'no-sub-interface-for-vlan': (device) => ({
    en: `${device} has no interface for this VLAN. Check that the router has a sub-interface with that VLAN number.`,
    ja: `${device} には、この VLAN 用の受け口がありません。ルータに、その VLAN 番号の受け口（サブインターフェース）があるか見てください。`,
  }),
  'hub-no-egress-port': (device) => ({
    en: `${device} had nowhere to send it on. Check the cables on ${device}.`,
    ja: `${device} には、送り出す先がありませんでした。${device} のケーブルを見てください。`,
  }),
  'hub-no-egress-neighbor': (device) => ({
    en: `${device} had nowhere to send it on. Check the cables on ${device}.`,
    ja: `${device} には、送り出す先がありませんでした。${device} のケーブルを見てください。`,
  }),
  'queue-full': (device) => ({
    en: `${device} was too busy: its waiting line was full. Check the speed limit set on that link.`,
    ja: `${device} が混んでいて、順番待ちの列がいっぱいでした。その線に設定された速さの上限を見てください。`,
  }),
  'class-queue-full': (device) => ({
    en: `${device} was too busy: the waiting line for this kind of traffic was full. Check the speed limit set on that link.`,
    ja: `${device} が混んでいて、この種類の通信の順番待ちの列がいっぱいでした。その線に設定された速さの上限を見てください。`,
  }),
} satisfies Record<string, (device: string, leg: Leg, context: DropContext) => Localised>;

/** The drop reasons with text of their own. Any other reason gets a generic sentence. */
export const DROP_REASONS = Object.keys(DROP_TEXT);

function dropBody(reason: string, leg: Leg, device: string, context: DropContext): Localised {
  if (Object.prototype.hasOwnProperty.call(DROP_TEXT, reason)) {
    return DROP_TEXT[reason as keyof typeof DROP_TEXT](device, leg, context);
  }
  return {
    en: `It was stopped on the way${reason ? ` (the simulator says: ${reason})` : ''}. Look on the diagram at where it stopped.`,
    ja: `とちゅうで止まりました${reason ? `（シミュレータの理由：${reason}）` : ''}。図で、どこで止まったかを見てください。`,
  };
}

/**
 * What stopped a probe. `leg` separates "the request never arrived" from "the
 * request arrived but the reply did not come back"; `device` is the label of
 * the node that reported the drop.
 */
export function dropMessage(
  reason: string,
  leg: Leg,
  device: string,
  context: DropContext = {},
): Localised {
  const body = dropBody(reason, leg, device, context);
  return leg === 'reply' ? join(REPLY_LOST, body) : body;
}

// --- Result codes --------------------------------------------------------------

export const CODE_TEXT: Record<CheckResultCode, Localised> = {
  ok: {
    en: 'This check passed.',
    ja: 'この確認は合格です。',
  },
  'not-delivered': {
    en: 'It did not arrive. Look on the diagram at where it stopped.',
    ja: '届きませんでした。図で、どこで止まったかを見てください。',
  },
  'delivered-but-forbidden': {
    en: 'It arrived where it must not. Look at the setting that is supposed to keep these two apart.',
    ja: '届いてはいけない相手に、届いてしまいました。この 2 台を分けるはずの設定を見てください。',
  },
  'wrong-cause': {
    en: 'It did not arrive, but not in the way this exercise asks for. Keep the addresses and cables, and let the settings of the network keep the two apart.',
    ja: '届きませんでしたが、この課題が求める止め方ではありません。アドレスや線はそのままにして、ネットワークの設定で 2 台を分けてください。',
  },
  'wrong-path': {
    en: 'It arrived, but not by the path this exercise asks for. Look on the diagram at which devices it passes through.',
    ja: '届きましたが、この課題が求める道を通っていません。図で、どの機器を通ったかを見てください。',
  },
  'route-missing': {
    en: 'The router does not have the route this exercise asks for. Look at the destination of its routes, and at the router each is handed to.',
    ja: 'ルータに、この課題が求める経路がありません。経路の行き先と、次に渡すルータを見てください。',
  },
  'wrong-root': {
    en: 'A different switch is the centre of the spanning tree (the root bridge). The switch with the lowest priority number becomes the centre.',
    ja: '別のスイッチが、中心（ルートブリッジ）になっています。優先度の数字がいちばん小さいスイッチが、中心になります。',
  },
  'wrong-role': {
    en: 'That switch port does not have the role this exercise asks for. Look at which switch is the centre of the spanning tree (the root bridge).',
    ja: 'その差し込み口は、この課題が求める役割になっていません。どのスイッチが中心（ルートブリッジ）かを見てください。',
  },
  'no-acl-drop': {
    en: 'The list of allowed traffic (ACL) on that device did not stop it. Look at which line matches this traffic, and at the order of the lines.',
    ja: 'その機器の「通してよい通信の一覧（ACL）」は、これを止めませんでした。当てはまる行と、行の順番を見てください。',
  },
  'no-translation': {
    en: 'The address of the sender was not rewritten (NAT) on the way out. Check which side of the router is marked inside and which outside.',
    ja: '送り主のアドレスが、書きかえ（NAT）されませんでした。ルータのどちら側が「内側」で、どちら側が「外側」かを見てください。',
  },
  'too-many-changes': {
    en: 'You changed more settings than this exercise allows. Put back the ones that were not needed.',
    ja: '変えてよい数より多くの設定を変えました。必要のなかった設定を、元に戻してください。',
  },
  'no-address': {
    en: 'A device has no address, so nothing could be sent. Give it an address first.',
    ja: 'アドレスが入っていない機器があります。まず、アドレスを入れてください。',
  },
  'config-invalid': {
    en: 'The simulator could not use this configuration. Put the exercise back to its start and try again.',
    ja: 'この設定では、シミュレータを動かせませんでした。課題を最初の状態に戻して、もう一度やってみてください。',
  },
  'engine-error': {
    en: 'The simulator stopped with an error, so this could not be checked. Try again, or put the exercise back to its start.',
    ja: 'シミュレータがエラーで止まり、確かめられませんでした。もう一度やってみるか、課題を最初の状態に戻してください。',
  },
};

export interface ExplainDetail {
  /** What stopped the probe, for `not-delivered` and `wrong-cause`. */
  readonly drop?: { readonly reason: string; readonly leg: Leg; readonly device: string };
  /** `not-delivered`: a cause read off the topology. It replaces the drop's sentence. */
  readonly diagnosis?: DiagnosisDetail;
  /** See `DropContext`. */
  readonly routesEditable?: boolean;
  /** `wrong-root`: the label of the switch that is the root now. */
  readonly device?: string;
  /** `too-many-changes`: how many settings differ, and how many may. */
  readonly count?: number;
  readonly max?: number;
}

/** The message of one check result: the code's sentence, made specific where the detail allows. */
export function explain(code: CheckResultCode, detail: ExplainDetail = {}): Localised {
  const { drop, diagnosis, device, count, max } = detail;
  const context: DropContext = detail.routesEditable === true ? { routesEditable: true } : {};
  if (code === 'not-delivered' && diagnosis) return diagnosisMessage(diagnosis);
  if (code === 'not-delivered' && drop) {
    return dropMessage(drop.reason, drop.leg, drop.device, context);
  }
  if (code === 'wrong-cause' && drop) {
    return join(CODE_TEXT[code], dropBody(drop.reason, drop.leg, drop.device, context));
  }
  if (code === 'wrong-root' && device !== undefined) {
    return {
      en: `${device} is the centre of the spanning tree (the root bridge) now. The switch with the lowest priority number becomes the centre.`,
      ja: `いまは ${device} が、中心（ルートブリッジ）です。優先度の数字がいちばん小さいスイッチが、中心になります。`,
    };
  }
  if (code === 'too-many-changes' && count !== undefined && max !== undefined) {
    return {
      en: `You changed ${count} settings; this exercise allows ${max}. Put back the ones that were not needed.`,
      ja: `設定を ${count} か所変えました。変えてよいのは ${max} か所までです。必要のなかった設定を、元に戻してください。`,
    };
  }
  return CODE_TEXT[code];
}

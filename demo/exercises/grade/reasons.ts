/**
 * Why a check passed or failed, in a beginner's words, in both languages.
 *
 * Every sentence says what was observed and what to look at next. A term the
 * learner may not know comes with a gloss the first time it appears in a
 * message. Device names are labels (what the canvas shows), never ids.
 */

import type { CheckResultCode, Localised } from '../model/types';

type Leg = 'request' | 'reply';

const join = (first: Localised, second: Localised): Localised => ({
  en: `${first.en} ${second.en}`,
  ja: `${first.ja}${second.ja}`,
});

// --- Drop reasons --------------------------------------------------------------

const LEG_TEXT: Record<Leg, Localised> = {
  request: {
    en: 'The request never arrived.',
    ja: '送ったものは、相手に届きませんでした。',
  },
  reply: {
    en: 'The request arrived, but the reply did not come back.',
    ja: '送ったものは相手に届きましたが、返事が戻ってきませんでした。',
  },
};

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
  'no-route': (_device, leg) =>
    leg === 'request'
      ? {
          en: 'A device on the way did not know a path to the destination. Check that the first part of each address matches the network it is connected to.',
          ja: '途中の機器が、行き先への道を知りませんでした。アドレスの最初の部分が、つながっているネットワークと合っているか見てください。',
        }
      : {
          en: 'A device on the way back did not know a path to the sender. Check the address of the sender, and that the devices on the far side know the way back.',
          ja: '帰り道の途中の機器が、送り主への道を知りませんでした。送り主のアドレスと、相手側の機器が帰り道を知っているかを見てください。',
        },
  'acl-deny': (device, leg) => ({
    en:
      `${device} refused it: its list of allowed traffic (ACL) has no line that lets this through. Look at the list on ${device}; whatever no line allows is refused.` +
      (leg === 'reply' ? ' Replies are checked against the list too.' : ''),
    ja:
      `${device} が通しませんでした。${device} の「通してよい通信の一覧（ACL）」に、これを通す行がありません。一覧を見てください。どの行にも当てはまらない通信は通りません。` +
      (leg === 'reply' ? '返事も、この一覧で調べられます。' : ''),
  }),
  'no-egress-in-vlan': (device) => ({
    en: `${device} had no port in the same group (VLAN) to send it out of. Check that the two ports have the same VLAN number, and that the link between switches carries that VLAN.`,
    ja: `${device} には、同じグループ（VLAN）の出口がありませんでした。送り主と相手の差し込み口が同じ VLAN 番号か、スイッチ同士をつなぐ線がその VLAN を通すかを見てください。`,
  }),
  'vlan-ingress-violation': (device) => ({
    en: `${device} did not accept it on the port it came in on: that port does not carry this group (VLAN). Check the VLAN setting of that port.`,
    ja: `${device} は、入ってきた差し込み口でこれを受け取りませんでした。その差し込み口は、このグループ（VLAN）を通す設定になっていません。差し込み口の VLAN の設定を見てください。`,
  }),
  'stp-port-blocked': (device) => ({
    en: `${device} keeps that port closed, so that traffic cannot circle forever in a ring of switches (spanning tree). Look at which port is closed, and whether another way round is open.`,
    ja: `${device} は、輪になった配線で通信が回り続けないように、その差し込み口を止めています（スパニングツリー）。どの差し込み口が止まっているか、別の道が開いているかを見てください。`,
  }),
  'link-failed': () => ({
    en: 'A cable on the way is down. Look for the link that is switched off.',
    ja: '途中のケーブルが切れています。切れている線を探してください。',
  }),
  'node-down': (device) => ({
    en: `${device} is switched off. Look for a path that does not pass through it.`,
    ja: `${device} の電源が入っていません。${device} を通らない道があるかを見てください。`,
  }),
  'interface-down': (device) => ({
    en: `A port on ${device} is switched off. Look at which port the path uses.`,
    ja: `${device} の差し込み口が止まっています。道がどの差し込み口を使うかを見てください。`,
  }),
  'ttl-exceeded': () => ({
    en: 'It was passed along too many times and was thrown away (every packet has a limit on that, the TTL). Usually two devices keep sending it back to each other. Check the routes of the routers on the way.',
    ja: '何度も中継されすぎて、捨てられました（パケットには中継できる回数の上限、TTL があります）。たいていは、2 台の機器がお互いに送り返し続けています。途中のルータの経路を見てください。',
  }),
  'routing-loop': () => ({
    en: 'It went round in a circle between devices. Check that no two devices point at each other for this destination, and that no two devices use the same address.',
    ja: '機器のあいだをぐるぐる回りました。2 台がお互いを行き先にしていないか、同じアドレスを 2 台が使っていないかを見てください。',
  }),
  'no-nat-entry': (device) => ({
    en: `${device} rewrites addresses (NAT) and had no record of this conversation, so it could not pass it on. Check which side of ${device} is marked inside and which outside.`,
    ja: `${device} はアドレスの書きかえ（NAT）をしていますが、この通信の記録がなかったので通せませんでした。${device} のどちら側が「内側」で、どちら側が「外側」かを見てください。`,
  }),
  'nat-port-exhausted': (device) => ({
    en: `${device} rewrites addresses (NAT) and ran out of free port numbers. Too many conversations are open through it at once.`,
    ja: `${device} はアドレスの書きかえ（NAT）をしていますが、使える番号（ポート番号）が残っていませんでした。同時に開いている通信が多すぎます。`,
  }),
  'fragmentation-needed': () => ({
    en: 'It was too big for a link on the way and was not allowed to be split. Check the size limit (MTU) of the links.',
    ja: '途中の線には大きすぎて、分けることも許されていませんでした。線ごとの大きさの上限（MTU）を見てください。',
  }),
  'no-sub-interface-for-vlan': (device) => ({
    en: `${device} has no interface for this group (VLAN). Check that the router has a sub-interface with that VLAN number.`,
    ja: `${device} には、このグループ（VLAN）用の受け口がありません。ルータに、その VLAN 番号の受け口（サブインターフェース）があるかを見てください。`,
  }),
  'hub-no-egress-port': (device) => ({
    en: `${device} had nowhere to send it on: nothing else is connected to it. Check the cables on ${device}.`,
    ja: `${device} には、送り出す先がありませんでした。ほかに何もつながっていません。${device} のケーブルを見てください。`,
  }),
  'hub-no-egress-neighbor': (device) => ({
    en: `${device} had nowhere to send it on: nothing else is connected to it. Check the cables on ${device}.`,
    ja: `${device} には、送り出す先がありませんでした。ほかに何もつながっていません。${device} のケーブルを見てください。`,
  }),
  'queue-full': (device) => ({
    en: `${device} was too busy: its waiting line was full, so it threw the packet away. Check the speed limit set on that link.`,
    ja: `${device} は混んでいて、順番待ちの列がいっぱいだったので捨てました。その線に設定された速さの上限を見てください。`,
  }),
  'class-queue-full': (device) => ({
    en: `${device} was too busy: the waiting line for this kind of traffic was full, so it threw the packet away. Check the speed limit set on that link.`,
    ja: `${device} は混んでいて、この種類の通信の順番待ちの列がいっぱいだったので捨てました。その線に設定された速さの上限を見てください。`,
  }),
} satisfies Record<string, (device: string, leg: Leg) => Localised>;

/** The drop reasons with text of their own. Any other reason gets a generic sentence. */
export const DROP_REASONS = Object.keys(DROP_TEXT);

function dropBody(reason: string, leg: Leg, device: string): Localised {
  if (Object.prototype.hasOwnProperty.call(DROP_TEXT, reason)) {
    return DROP_TEXT[reason as keyof typeof DROP_TEXT](device, leg);
  }
  return {
    en: `It was stopped on the way${reason ? ` (the simulator says: ${reason})` : ''}. Press play to see where it stopped.`,
    ja: `途中で止まりました${reason ? `（シミュレータの理由：${reason}）` : ''}。再生して、どこで止まったかを見てください。`,
  };
}

/**
 * What stopped a probe. `leg` separates "the request never arrived" from "the
 * request arrived but the reply did not come back"; `device` is the label of
 * the node that reported the drop.
 */
export function dropMessage(reason: string, leg: Leg, device: string): Localised {
  return join(LEG_TEXT[leg], dropBody(reason, leg, device));
}

// --- Result codes --------------------------------------------------------------

export const CODE_TEXT: Record<CheckResultCode, Localised> = {
  ok: {
    en: 'This check passed.',
    ja: 'この確認は合格です。',
  },
  'not-delivered': {
    en: 'It did not arrive. Press play to see where it stopped.',
    ja: '届きませんでした。再生して、どこで止まったかを見てください。',
  },
  'delivered-but-forbidden': {
    en: 'It arrived, but in this exercise it must not. Look at the setting that is supposed to keep these two apart.',
    ja: '届きました。でも、この課題では届いてはいけない相手です。この 2 台を分けるはずの設定を見てください。',
  },
  'wrong-cause': {
    en: 'It did not arrive, but not in the way this exercise asks for. Removing an address or a cable does not count: the settings of the network must keep the two apart.',
    ja: '届きませんでしたが、この課題が求める止め方ではありません。アドレスを消したり線を抜いたりするのは数えません。ネットワークの設定で 2 台を分けてください。',
  },
  'wrong-path': {
    en: 'It arrived, but not by the path this exercise asks for. Press play and follow which devices it passes through.',
    ja: '届きましたが、この課題が求める道を通っていません。再生して、どの機器を通るかを追ってください。',
  },
  'route-missing': {
    en: 'The router does not have the route this exercise asks for. Open its route table and compare the destination and the next device (next hop).',
    ja: 'ルータに、この課題が求める経路がありません。経路の表を開いて、行き先と次の機器（ネクストホップ）を比べてください。',
  },
  'wrong-root': {
    en: 'A different switch is the centre of the spanning tree (the root bridge). The switch with the lowest priority number becomes the root.',
    ja: '別のスイッチが、スパニングツリーの中心（ルートブリッジ）になっています。優先度の数字がいちばん小さいスイッチが中心になります。',
  },
  'wrong-role': {
    en: 'That switch port does not have the role this exercise asks for. Look at which switch is the centre of the spanning tree (the root bridge) and which port is closed.',
    ja: 'その差し込み口は、この課題が求める役割になっていません。どのスイッチがスパニングツリーの中心（ルートブリッジ）か、どの差し込み口が止まっているかを見てください。',
  },
  'no-acl-drop': {
    en: 'The list of allowed traffic (ACL) on that device did not stop it. Check that a line matches this traffic, and which line is looked at first.',
    ja: 'その機器の「通してよい通信の一覧（ACL）」は、これを止めませんでした。この通信に当てはまる行があるか、どの行が先に調べられるかを見てください。',
  },
  'no-translation': {
    en: 'The address of the sender was not rewritten (NAT) on the way out. Check which side of the router is marked inside and which outside.',
    ja: '送り主のアドレスは、外へ出るときに書きかえ（NAT）されませんでした。ルータのどちら側が「内側」で、どちら側が「外側」かを見てください。',
  },
  'too-many-changes': {
    en: 'You changed more settings than this exercise allows. Put back the ones that were not needed.',
    ja: 'この課題で変えてよい数より多くの設定を変えました。必要のなかった設定を元に戻してください。',
  },
  'no-address': {
    en: 'One of the two devices has no address, so nothing could be sent. Give it an address first.',
    ja: 'どちらかの機器にアドレスがないので、何も送れませんでした。まずアドレスを入れてください。',
  },
  'config-invalid': {
    en: 'The simulator could not use this configuration. Reset the exercise and try again.',
    ja: 'この設定では、シミュレータを動かせませんでした。課題を最初の状態に戻して、もう一度やってみてください。',
  },
  'engine-error': {
    en: 'The simulator stopped with an error, so this could not be checked. Try again; if it happens again, reset the exercise.',
    ja: 'シミュレータがエラーで止まったので、確かめられませんでした。もう一度やってみてください。また起きたら、課題を最初の状態に戻してください。',
  },
};

export interface ExplainDetail {
  /** What stopped the probe, for `not-delivered` and `wrong-cause`. */
  readonly drop?: { readonly reason: string; readonly leg: Leg; readonly device: string };
  /** `wrong-root`: the label of the switch that is the root now. */
  readonly device?: string;
  /** `too-many-changes`: how many settings differ, and how many may. */
  readonly count?: number;
  readonly max?: number;
}

/** The message of one check result: the code's sentence, made specific where the detail allows. */
export function explain(code: CheckResultCode, detail: ExplainDetail = {}): Localised {
  const { drop, device, count, max } = detail;
  if (code === 'not-delivered' && drop) return dropMessage(drop.reason, drop.leg, drop.device);
  if (code === 'wrong-cause' && drop) {
    return join(CODE_TEXT[code], dropBody(drop.reason, drop.leg, drop.device));
  }
  if (code === 'wrong-root' && device !== undefined) {
    return {
      en: `${device} is the centre of the spanning tree (the root bridge) now. The switch with the lowest priority number becomes the root.`,
      ja: `いまは ${device} が、スパニングツリーの中心（ルートブリッジ）です。優先度の数字がいちばん小さいスイッチが中心になります。`,
    };
  }
  if (code === 'too-many-changes' && count !== undefined && max !== undefined) {
    return {
      en: `You changed ${count} settings; this exercise allows ${max}. Put back the ones that were not needed.`,
      ja: `設定を ${count} か所変えました。この課題で変えてよいのは ${max} か所までです。必要のなかった設定を元に戻してください。`,
    };
  }
  return CODE_TEXT[code];
}

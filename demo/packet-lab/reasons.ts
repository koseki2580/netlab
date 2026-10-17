/**
 * What the judge says, in a beginner's words, in both languages.
 *
 * Every message leads with the cause in everyday words, then says what to look
 * at. A field is named only by the label the form shows (`fields.ts`); a device
 * only by its label on the diagram. No message states an answer value.
 */

import { FIELD_LABELS } from './fields';
import type { Carries, FieldId, Localised, PacketEvidence } from './model';

const L = (en: string, ja: string): Localised => ({ en, ja });

export const join = (...parts: readonly Localised[]): Localised => ({
  en: parts.map((part) => part.en).join(' '),
  ja: parts.map((part) => part.ja).join(''),
});

/** "the branch router", "the HQ router": the label with a lower-case first letter unless it is an abbreviation. */
export function theEn(label: Localised): string {
  const text = label.en;
  const keep =
    text.length > 1 &&
    text.charAt(1) === text.charAt(1).toUpperCase() &&
    /[A-Z]/.test(text.charAt(1));
  return `the ${keep ? text : text.charAt(0).toLowerCase() + text.slice(1)}`;
}

const f = (id: FieldId): Localised => FIELD_LABELS[id];
const ORDINAL_EN = ['first', 'second', 'third', 'fourth', 'fifth'];
const ordinalEn = (n: number): string => ORDINAL_EN[n - 1] ?? `${n}th`;

export const MESSAGES = {
  ok: L('Done.', 'できています。'),
  notFilled: (id: FieldId) => L(`"${f(id).en}" is still empty.`, `「${f(id).ja}」がまだ空です。`),
  invalid: (id: FieldId) =>
    L(
      `"${f(id).en}" does not hold a value of the kind this box takes.`,
      `「${f(id).ja}」の値が、この欄に書ける形になっていません。`,
    ),
  ownAddress: L(
    `That is the sender's own address. "${f('dstIp').en}" is the address of the device it should reach.`,
    `それは送り主自身のアドレスです。「${f('dstIp').ja}」には、届けたい相手のアドレスを書きます。`,
  ),
  nobodyHasAddress: L(
    'No device on the diagram has that address. Look up the address of the device it should reach on the diagram.',
    'そのアドレスを持つ機器は、図の中にありません。届けたい機器のアドレスを、図で確かめてください。',
  ),
  deliveredElsewhere: (got: Localised, want: Localised) =>
    L(
      `The packet arrived at ${theEn(got)}, not at ${theEn(want)}. Compare "${f('dstIp').en}" with the addresses on the diagram.`,
      `パケットは${got.ja}に届きました。届けたいのは${want.ja}です。「${f('dstIp').ja}」を図のアドレスと見比べてください。`,
    ),
  ttlRanOut: (router: Localised, nth: number) =>
    L(
      `The TTL ran out, and the ${ordinalEn(nth)} router (${theEn(router)}) threw the packet away. Each router it crosses takes 1 off.`,
      `TTL が足りず、${nth} 台目のルータ（${router.ja}）で捨てられました。ルータを 1 台越えるたびに 1 ずつ減ります。`,
    ),
  ttlToSpare: L(
    'It arrived, but with TTL to spare: a smaller TTL would have arrived too. Count the routers on the way.',
    '届きましたが、TTL に余りがあります。もっと小さい数でも届きます。途中のルータの数を数えてください。',
  ),
  filterRefused: (router: Localised) =>
    L(
      `No "allow" line of the list (ACL) on ${theEn(router)} fits this traffic, so it was refused. Compare "${f('carries').en}" and "${f('dstPort').en}" with its lines.`,
      `${router.ja}の一覧（ACL）に、この通信に当てはまる「通す」行がなく、止められました。「${f('carries').ja}」と「${f('dstPort').ja}」を、一覧の行と見比べてください。`,
    ),
  tooBig: (router: Localised) =>
    L(
      `The packet is too big for the cable after ${theEn(router)}, and it carries the "do not split" mark, so the router threw it away and sent back a note with the cable's limit (MTU).`,
      `${router.ja}の先の回線には、この大きさのパケットは入りません。「分割しない」の印が付いているので、ルータは分けずに捨て、回線の上限（MTU）を書いた知らせを送り主に返しました。`,
    ),
  noRoute: (router: Localised) =>
    L(
      `${theEn(router).replace(/^the/, 'The')} knows no way to that destination and threw the packet away. "${f('dstIp').en}" belongs to no network on the diagram.`,
      `${router.ja}は、このあて先への道を知らず、捨てました。「${f('dstIp').ja}」が、図のどのネットワークのものでもありません。`,
    ),
  handedToWrong: (device: Localised) =>
    L(
      `The switch handed the frame to ${theEn(device)}, because "${f('dstMac').en}" is its MAC address. It is not the destination, so it threw the packet away.`,
      `あて先 MAC アドレスが${device.ja}のものなので、スイッチはフレームを${device.ja}に渡しました。${device.ja}はあて先ではないので、捨てました。`,
    ),
  notDroppedSplit: L(
    'The router quietly cut the packet into pieces and delivered them; no note came back. With the "do not split" mark it may not cut it, and answers instead.',
    'ルータは黙ってパケットを分割して届け、知らせは返ってきませんでした。「分割しない」の印があると、ルータは分割できず、知らせを返します。',
  ),
  notDroppedFits: L(
    'The packet fits the narrow cable as it is, so the router passed it on without a word.',
    'このパケットは細い回線にそのまま入るので、ルータは何も言わずに通しました。',
  ),
  notDropped: (got: Localised) =>
    L(
      `The packet was not stopped: it arrived at ${theEn(got)}.`,
      `パケットは止まらずに、${got.ja}まで届きました。`,
    ),
  droppedElsewhere: L(
    'It was stopped, but not where and why the task asks.',
    '止まりましたが、課題の場所と理由ではありません。',
  ),
  wasSplit: L(
    'It arrived, but cut into pieces on the way. Make it small enough to pass whole.',
    '届きましたが、途中で分割されました。分割されずに通れる大きさにしてください。',
  ),
  wasNotSplit: L(
    'It arrived whole: nothing cut it on the way. Look at what the task allows to happen to it.',
    '分割されずに、そのまま届きました。途中で何が起きてよいかを、課題でもう一度確かめてください。',
  ),
  notLargest: L(
    'It passes whole, but a bigger packet would too. Find the very limit of the narrow cable.',
    'そのまま通りますが、もっと大きくても分割されずに通れます。細い回線に入る上限いっぱいを探してください。',
  ),
  tooManyChanges: (count: number, max: number) =>
    L(
      `${count} fields were changed; do it with ${max} or fewer.`,
      `変えた欄が ${count} つあります。${max} つまでで届くようにしてください。`,
    ),
  engineError: L(
    'The simulator could not run this packet. Try again; if it happens again, tell us.',
    'シミュレータがこのパケットを動かせませんでした。もう一度試して、また起きたら知らせてください。',
  ),
  noPick: L('Nothing is chosen yet.', 'まだ選んでいません。'),
};

/** Whose MAC the learner wrote, and why the first step needs another one. */
export function macMessage(
  owner: NonNullable<PacketEvidence['macOwner']>,
  owned: Localised | null,
  destination: Localised,
  sameNetwork: boolean,
): Localised {
  const why = sameNetwork
    ? L(
        `${theEn(destination).replace(/^the/, 'The')} is on the sender's own network, so the frame goes to it directly, not through the router.`,
        `${destination.ja}は送り主と同じネットワークにいるので、フレームはルータを通さず、直接${destination.ja}に送ります。`,
      )
    : L(
        `${theEn(destination).replace(/^the/, 'The')} is on another network: the frame's first step goes to the router that leads out (the gateway), while the IP destination stays the same.`,
        `${destination.ja}は別のネットワークにあります。フレームの最初の 1 歩は外への出口のルータ（ゲートウェイ）あてで、IP のあて先は${destination.ja}のままです。`,
      );
  const name = owned ?? L('?', '?');
  const whose: Record<typeof owner, Localised> = {
    right: MESSAGES.ok,
    destination: L(
      `That is the MAC address of ${theEn(name)} itself.`,
      `それは${name.ja}自身の MAC アドレスです。`,
    ),
    neighbour: L(
      `That is the MAC address of ${theEn(name)}, a neighbour on the same switch: the switch would hand it the frame.`,
      `それは同じスイッチにつながる${name.ja}の MAC アドレスです。スイッチはフレームを${name.ja}に渡してしまいます。`,
    ),
    sender: L("That is the sender's own MAC address.", 'それは送り主自身の MAC アドレスです。'),
    gateway: L(
      `That is the MAC address of ${theEn(name)}.`,
      `それは${name.ja}の MAC アドレスです。`,
    ),
    'other-router': L(
      `That is the MAC address of ${theEn(name)}, which is not on the sender's cable run: a frame cannot be sent to it directly.`,
      `それは${name.ja}の MAC アドレスです。${name.ja}は送り主と同じ回線にいないので、フレームを直接送ることはできません。`,
    ),
    'router-far-side': L(
      `That is the MAC address of the far side of ${theEn(name)}. A frame can only be sent to a side on the sender's own cable run.`,
      `それは${name.ja}の向こう側（送り主とつながっていない側）の MAC アドレスです。フレームを送れるのは、送り主と同じ回線につながっている側だけです。`,
    ),
    switch: L(
      `That is the MAC address of a port of ${theEn(name)}. A switch carries frames on; it is never their destination.`,
      `それは${name.ja}の差し込み口の MAC アドレスです。スイッチはフレームを運ぶだけで、あて先にはなりません。`,
    ),
    nobody: L(
      'No device on the diagram has that MAC address.',
      'その MAC アドレスを持つ機器は、図の中にありません。',
    ),
  };
  return owner === 'right' ? whose.right : join(whose[owner], why);
}

export type FragmentMistake =
  | 'wrong-count'
  | 'not-multiple-of-8'
  | 'ip-header-forgotten'
  | 'transport-header-forgotten'
  | 'over-mtu'
  | 'wrong-sizes'
  | 'offsets-in-bytes'
  | 'offsets-in-units'
  | 'wrong-offsets'
  | 'mf-on-last'
  | 'mf-cleared-middle';

const rowsJa = (rows: readonly number[]) => rows.map((row) => `${row} 番目`).join('・');
const rowsEn = (rows: readonly number[]) =>
  rows.length === 1 ? `piece ${rows[0]}` : `pieces ${rows.join(', ')}`;

export function fragmentMessage(
  mistake: FragmentMistake,
  rows: readonly number[],
  carries: Carries,
): Localised {
  const header = carries === 'udp' ? 'UDP' : 'ICMP';
  switch (mistake) {
    case 'wrong-count':
      return L(
        'The number of pieces is not right. Work out how much one piece can carry (the MTU less the 20-byte IP header, rounded down to a multiple of 8) and divide what is to be carried by it.',
        '断片の数がちがいます。1 つの断片で運べる量（MTU から IP ヘッダ 20 バイトを引き、8 の倍数に切り下げた量）で、運ぶ量を割ってみてください。',
      );
    case 'not-multiple-of-8':
      return L(
        `In ${rowsEn(rows)} what comes after the IP header is not a multiple of 8 bytes. Every piece but the last must carry a multiple of 8, because positions are counted in steps of 8 bytes.`,
        `${rowsJa(rows)}の断片は、IP ヘッダの後ろの中身が 8 の倍数ではありません。位置を 8 バイト単位で数えるので、最後以外の断片の中身は 8 の倍数でなければなりません。`,
      );
    case 'ip-header-forgotten':
      return L(
        'The 20-byte IP header is missing from the pieces. Every piece carries an IP header of its own, and the header too must fit within the MTU.',
        '断片の大きさに、IP ヘッダの 20 バイトが入っていません。断片はどれも自分の IP ヘッダを持ち、それも含めて MTU に収まらなければなりません。',
      );
    case 'transport-header-forgotten':
      return L(
        `The 8-byte ${header} header is missing from what is carried. The router cuts up everything after the IP header, not the data alone.`,
        `運ぶ量に、${header} ヘッダの 8 バイトが入っていません。ルータが分けるのは IP ヘッダより後ろの全部で、データだけではありません。`,
      );
    case 'over-mtu':
      return L(
        `${rowsEn(rows).replace(/^p/, 'P')} is bigger than the MTU and would not fit the narrow cable.`,
        `${rowsJa(rows)}の断片は MTU より大きく、細い回線に入りません。`,
      );
    case 'wrong-sizes':
      return L(
        `The size of ${rowsEn(rows)} is not right. Every piece but the last is filled as full as it can be; the last takes what is left.`,
        `${rowsJa(rows)}の断片の大きさがちがいます。最後以外は入るだけ詰め、残りを最後の断片に入れます。`,
      );
    case 'offsets-in-bytes':
      return L(
        'The positions are written in bytes. On the wire, a position is counted in steps of 8 bytes.',
        '位置がバイト数で書かれています。位置は 8 バイトを 1 として数えます。',
      );
    case 'offsets-in-units':
      return L(
        'The positions are written in steps of 8 bytes; this exercise asks for bytes.',
        '位置が 8 バイト単位で書かれています。この問題ではバイト数で答えます。',
      );
    case 'wrong-offsets':
      return L(
        `The position of ${rowsEn(rows)} is not right. A piece's position is how much the pieces before it carried after their IP headers.`,
        `${rowsJa(rows)}の断片の位置がちがいます。位置は、その断片より前の断片が運んだ中身（IP ヘッダを除く）の合計です。`,
      );
    case 'mf-on-last':
      return L(
        'The last piece carries the "more pieces follow" mark. The receiver would wait for more for ever.',
        '最後の断片に「続きあり」の印が付いています。受け取る側は、まだ続きが来ると思って待ち続けます。',
      );
    case 'mf-cleared-middle':
      return L(
        `${rowsEn(rows).replace(/^p/, 'P')} lacks the "more pieces follow" mark. Every piece but the last must carry it.`,
        `${rowsJa(rows)}の断片に「続きあり」の印がありません。最後の断片以外には必ず付けます。`,
      );
  }
}

export const REASSEMBLES_ANYWAY = L(
  'These pieces would fit back together, but a router does not cut like this.',
  'この分け方でも元には戻せますが、ルータはこう分けません。',
);

/**
 * What a wrong pick is, by the candidate's `why`, where the mistake has words
 * of its own. None of these names the right answer.
 */
export const PICK_MESSAGES: Readonly<Record<string, Localised>> = {
  // The frame on a cable after a router: its source MAC.
  'src-sender': L(
    "That is the sender's MAC. It is on the frame only on the first cable; every router writes the frame anew.",
    'それは送り主の MAC アドレスです。送り主の MAC が入っているのは最初の区間だけで、ルータを越えるたびにフレームは書き直されます。',
  ),
  'src-router-in': L(
    'That is the side of the router the packet came in on. Sending it on, the router puts the MAC of the side it goes out of.',
    'それはルータの、パケットが入ってきた側の MAC です。送り出すときは、出ていく側の MAC が送り主になります。',
  ),
  'src-next': L(
    'That is the device that takes the frame on this cable: it belongs in the destination, not the source.',
    'それはこの回線でフレームを受け取る機器の MAC で、あて先の欄に入るものです。',
  ),
  'src-destination': L(
    "That is the final destination's MAC; it is never the frame's source.",
    'それは最後のあて先の MAC です。送り主の欄には入りません。',
  ),
  // ... its destination MAC.
  'dst-destination-early': L(
    "That is the final destination's MAC. On this cable the frame goes to the next router; its MAC is the destination here.",
    'それは最後のあて先の MAC です。この区間で受け取るのは次のルータなので、あて先 MAC はそのルータのものです。',
  ),
  'dst-router-out': L(
    'That is the router that sent the frame onto this cable: it belongs in the source.',
    'それはこの回線へフレームを送り出したルータ自身の MAC で、送り主の欄に入るものです。',
  ),
  'dst-gateway': L(
    'That was the destination on the first cable. At every router the destination MAC is written anew for the next cable.',
    'それは最初の区間のあて先です。ルータを越えるたびに、あて先 MAC は次の区間のものに書き直されます。',
  ),
  'dst-switch': L(
    'A switch carries frames on without rewriting their MACs, and it is never their destination.',
    'スイッチはフレームを運ぶだけで、MAC アドレスを書き直しません。あて先にもなりません。',
  ),
  // ... the TTL on that cable.
  'ttl-unchanged': L(
    'That is the TTL it left with. Every router it crosses takes 1 off.',
    'それは送り出したときの TTL のままです。ルータを 1 台越えるたびに 1 減ります。',
  ),
  'ttl-off-by-one': L(
    'The count is off by one. Count the routers before this cable, including the one that sent the packet onto it.',
    '数え方が 1 つずれています。この回線より手前のルータを、この回線へ送り出したルータも含めて数えてください。',
  ),
  'ttl-switches-counted': L(
    'A switch does not take anything off the TTL; only routers do.',
    'スイッチは TTL を減らしません。減らすのはルータだけです。',
  ),
  // Which router cuts the packet.
  'cut-equal-mtu': L(
    'The cable after that router has an MTU exactly the size of the packet. A packet no bigger than the MTU is not cut.',
    'そのルータの先の回線の MTU は、パケットとちょうど同じ大きさです。MTU 以下なら分割されません。',
  ),
  'cut-wide': L(
    'The cable after that router is wide enough (its MTU is bigger than the packet), so it is not cut there.',
    'そのルータの先の回線は、このパケットより MTU が大きいので、そこでは分割されません。',
  ),
  'cut-after': L(
    'By the time it reaches that router it has already been cut. The router that cuts is the one sending onto the narrow cable.',
    'パケットはそこに着く前に、もう分割されています。分割するのは、細い回線へ送り出すルータです。',
  ),
  'cut-none-but-narrow': L(
    'A cable on the way has an MTU smaller than the packet, so some router must cut it.',
    '途中に、パケットより MTU が小さい回線があります。どこかのルータが分割します。',
  ),
};

/**
 * The one-sentence reasons behind the rules, for the story behind "read more".
 * A rule a learner is only told is a rule they apply by habit, also where it
 * does not hold; the reason is what tells them where it does.
 */

import { L } from './text';

/** Why no two devices may share an address. */
export const WHY_UNIQUE = L(
  'No address may be used twice, the router included: with the same address on two devices it cannot be decided which one to deliver to, and only one of them gets anything.',
  'アドレスは、ルータもふくめて、だれともかぶらないようにします。同じアドレスが 2 台にあると、どちらに届けるか決められず、片方にしか届かなくなるからです。',
);

/** Why "/8" means one number. */
export const WHY_SLASH = L(
  'Each of the four numbers counts for 8, so /8 means the first number is the same, /16 the first two, and /24 the first three.',
  '数字 1 つが 8 ぶんなので、/8 は 1 つ目まで、/16 は 2 つ目まで、/24 は 3 つ目までが同じ、という意味です。',
);

/** Why a router has an address on each side. */
export const WHY_TWO_SIDES = L(
  'A router has an address on each side because it talks directly to the devices on each side, and a device can only talk directly to one on its own network.',
  'ルータがそれぞれの側にアドレスを持つのは、どちらの側の機器ともじかにやりとりするためです。機器がじかにやりとりできるのは、同じネットワークの相手だけです。',
);

/** Why the next router is named by its address on the side facing this router. */
export const WHY_FACING = L(
  'The next router is named by its address on the side facing this router, because a router can hand things directly only to a device on its own network.',
  '「次のルータ」がこちらを向いた側のアドレスなのは、ルータがじかに渡せるのは自分と同じネットワークの相手だけだからです。',
);

/** Why 0.0.0.0/0 matches everything. */
export const WHY_DEFAULT = L(
  '0.0.0.0/0 matches every destination: "/0" means not one of the four numbers has to be the same. It is used when no other line fits.',
  '0.0.0.0/0 は、どの行き先にも当てはまります。「/0」は、同じでなければならない数字が 1 つもない、という意味だからです。ほかの行が当てはまらないときに使われます。',
);

/** Why the lowest priority wins, and why the root belongs near the server. */
export const WHY_ROOT = L(
  'The lowest number wins so that every switch, by the same rule, picks the same one centre (on equal numbers the lower device number wins). Near the server it is best: every way to the server then runs along the tree, and none of them crosses a link that was closed.',
  'いちばん小さい数字が中心になるのは、どのスイッチも同じ決まりで、同じ 1 台を中心に選べるようにするためです（数字が同じなら、機器の番号が小さいほう）。中心はサーバーの近くがよいのは、みんなからサーバーへの道が木の枝にそって通り、止められたケーブルを通らずにすむからです。',
);

import type { Catalog } from '../../../../types';

/** The `rip` deck's questions (ja); its name is in the core chunk. */
export const rip: Catalog = {
  'learning.concept.rip.q1.prompt': 'RIP の経路選択基準は…',
  'learning.concept.rip.q1.a': 'ホップ数（ディスタンスベクタ）',
  'learning.concept.rip.q1.b': 'リンクコスト（OSPF と同じ）',
  'learning.concept.rip.q1.c': 'AS パス長（BGP と同じ）',
  'learning.concept.rip.q1.why':
    'RIP はルータのホップ数を数え、回線速度に関わらず最少ホップが勝ちます。',
  'learning.concept.rip.q2.prompt': 'RIP の使用可能な最大ホップ数は…',
  'learning.concept.rip.q2.a': '255 ホップ',
  'learning.concept.rip.q2.b': '15 ホップ',
  'learning.concept.rip.q2.c': '上限なし',
  'learning.concept.rip.q2.why':
    'RIP は 15 ホップが上限で、16 は「無限大」。このため小規模ネットワーク向けです。',
  'learning.concept.rip.q3.prompt': 'OSPF と比べて RIP は…',
  'learning.concept.rip.q3.a': '変化のあとの収束が速い',
  'learning.concept.rip.q3.b': 'はるかに大きい網に拡張できる',
  'learning.concept.rip.q3.c': '単純だが遅く規模が限られる',
  'learning.concept.rip.q3.why':
    'RIP の周期的なディスタンスベクタ更新は簡単ですが収束が遅く、リンクステートの OSPF ほど拡張しません。',
  'learning.concept.rip.q1.b.why':
    'リンクコストは OSPF の指標です。RIP はディスタンスベクタで単純にホップ数を数えます。',
  'learning.concept.rip.q1.c.why': 'AS パスは BGP のものです。RIP はホップ数で経路を選びます。',
  'learning.concept.rip.q2.a.why':
    'RIP の上限は 255 よりはるかに低く、使えるのは 15 ホップ、16 は到達不能を意味します（ループ抑止）。',
  'learning.concept.rip.q2.c.why':
    'RIP は意図的に制限されています。最大 15 ホップ、16 で到達不能 — 無制限にはスケールしません。',
  'learning.concept.rip.q3.a.why':
    'RIP は OSPF より収束が遅く（定期更新・無限カウント）、速くはありません。',
  'learning.concept.rip.q3.b.why':
    'RIP は 15 ホップ制限で小規模向けです。大規模に拡張できるのは OSPF です。',
};

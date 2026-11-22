import type { Catalog } from '../../../../types';

/** The `lldp` deck's questions (ja); its name is in the core chunk. */
export const lldp: Catalog = {
  'learning.concept.lldp.q1.b.why':
    'サブネット間のルーティングは L3 です。LLDP は直結の隣接機器とその能力を発見するだけです。',
  'learning.concept.lldp.q1.c.why':
    'LLDP は暗号化しません。機器の識別情報/能力を直結の隣接機器に広告します。',
  'learning.concept.lldp.q2.a.why':
    'インターネット全体には届きません。LLDP はリンク単位で、直結の隣接機器だけを発見し、遠隔の機器は見えません。',
  'learning.concept.lldp.q2.c.why':
    'LLDP は独自の EtherType を持つ L2 プロトコルで TCP では運ばれません。1 つのリンク内に留まります。',
  'learning.concept.lldp.q3.a.why':
    'IP の割り当ては DHCP です。LLDP は物理トポロジを把握し、VoIP 電話や PoE の自動設定を助けます。',
  'learning.concept.lldp.q3.b.why':
    '経路選択はルーティングプロトコルの仕事です。LLDP は隣接機器を発見してトポロジを把握し VoIP/PoE を助けます。',
  'learning.concept.lldp.q1.prompt': 'LLDP により機器は…',
  'learning.concept.lldp.q1.a': '直結の隣接機器とその能力を発見する',
  'learning.concept.lldp.q1.b': 'サブネット間を自動でルーティングする',
  'learning.concept.lldp.q1.c': 'ローカルリンク上でフレームを暗号化する',
  'learning.concept.lldp.q1.why':
    '機器は識別情報・ポート・能力を広告し、隣接が局所トポロジを学びます（CDP は Cisco 版）。',
  'learning.concept.lldp.q2.prompt': 'LLDP が動作するのは…',
  'learning.concept.lldp.q2.a': 'インターネット全体にまたがって',
  'learning.concept.lldp.q2.b': 'リンク単位・単一セグメント内',
  'learning.concept.lldp.q2.c': 'TCP コネクションの上',
  'learning.concept.lldp.q2.why':
    'LLDP フレームはリンクローカルで、スイッチやルータに転送されません。',
  'learning.concept.lldp.q3.prompt': 'LLDP がよく使われるのは…',
  'learning.concept.lldp.q3.a': '隣接機器への IP アドレス割り当て',
  'learning.concept.lldp.q3.b': 'サブネット間の経路選択',
  'learning.concept.lldp.q3.c': '物理トポロジ把握や VoIP/PoE 設定の補助',
  'learning.concept.lldp.q3.why':
    'NMS は LLDP から配線図を作り、電話が音声 VLAN や PoE 情報を学ぶのにも役立ちます。',
};

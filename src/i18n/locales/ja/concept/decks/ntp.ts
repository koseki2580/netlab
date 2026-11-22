import type { Catalog } from '../../../../types';

/** The `ntp` deck's questions (ja); its name is in the core chunk. */
export const ntp: Catalog = {
  'learning.concept.ntp.q1.b.why': 'ホスト名解決は DNS です。NTP は機器の時刻を同期します。',
  'learning.concept.ntp.q1.c.why':
    'アドレス割り当ては DHCP です。NTP は機器間で時刻を同期し続けます。',
  'learning.concept.ntp.q2.a.why':
    'VLAN は L2 トラフィックを分けます。NTP は時刻源をストラタム（基準時計からの距離）で整理します。',
  'learning.concept.ntp.q2.c.why':
    '自律システムは BGP のルーティングドメインです。NTP はストラタムで時刻源を順位付けします。',
  'learning.concept.ntp.q3.a.why':
    '時刻はケーブル速度と無関係です。ログの相関、証明書の有効性、認証で重要になります。',
  'learning.concept.ntp.q3.b.why':
    'MTU はフレームサイズの上限で時刻と無関係です。正確な時刻は証明書・ログ・TLS/Kerberos で重要です。',
  'learning.concept.ntp.q1.prompt': 'NTP の用途は…',
  'learning.concept.ntp.q1.a': '機器間で時刻を同期する',
  'learning.concept.ntp.q1.b': 'ホスト名をアドレスに解決する',
  'learning.concept.ntp.q1.c': 'インタフェースにアドレスを割り当てる',
  'learning.concept.ntp.q1.why': 'NTP は機器の時刻を基準時刻源に合わせ続けます。',
  'learning.concept.ntp.q2.prompt': 'NTP の時刻源の構成は…',
  'learning.concept.ntp.q2.a': 'VLAN 単位のグループ',
  'learning.concept.ntp.q2.b': 'ストラタム（0、1、2 …）',
  'learning.concept.ntp.q2.c': '自律システム単位のグループ',
  'learning.concept.ntp.q2.why':
    'ストラタム番号は基準時計からの距離で、小さいほど近く権威があります。',
  'learning.concept.ntp.q3.prompt': '正確な時刻が重要なのは…',
  'learning.concept.ntp.q3.a': 'ケーブルの高速化と伝搬遅延の低減',
  'learning.concept.ntp.q3.b': 'MTU の拡大とフラグメントの削減',
  'learning.concept.ntp.q3.c': 'ログの相関・証明書の有効性・時刻依存の認証',
  'learning.concept.ntp.q3.why':
    '証明書の有効期間・ログ突合・時刻ベース認証は、時刻がずれると壊れます。',
};

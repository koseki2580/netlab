import type { Catalog } from '../../../../types';

/** The `ndp` deck's questions (ja); its name is in the core chunk. */
export const ndp: Catalog = {
  'learning.concept.ndp.q1.b.why':
    'AS 間ルーティングは BGP です。NDP は ARP の仕事 — 近隣の IP を MAC に解決する役割を引き継ぎます。',
  'learning.concept.ndp.q1.c.why':
    'NDP は暗号化しません。ARP を置き換え、ICMPv6 メッセージで近隣の IP→MAC を解決します。',
  'learning.concept.ndp.q2.a.why':
    'SLAAC はネットワーク部を当てずっぽうにしません — プレフィックスは必ずルータ広告（RA）から来ます。ランダムになり得るのはインタフェース識別子の半分だけです。',
  'learning.concept.ndp.q2.c.why':
    'ホストはルータのアドレスをコピーしません。広告されたプレフィックスとインタフェース識別子から自分のアドレスを作ります。',
  'learning.concept.ndp.q3.a.why':
    'DAD は暗号化しません。近隣要請を送り、アドレスが未使用か確認します。',
  'learning.concept.ndp.q3.b.why':
    'DAD はアドレスを圧縮しません。仮アドレスをまず要請して一意性を検証します。',
  'learning.concept.ndp.q1.prompt': 'IPv6 で NDP が置き換える IPv4 のプロトコルは？',
  'learning.concept.ndp.q1.a': 'ARP — 近隣の IP を MAC アドレスに解決する',
  'learning.concept.ndp.q1.b': 'BGP — 自律システム間のルーティング',
  'learning.concept.ndp.q1.c': 'IPsec — 通信の暗号化',
  'learning.concept.ndp.q1.why':
    'NDP は ICMPv6 上で動きます。近隣要請/近隣広告が ARP を、ルータ要請/ルータ広告がルータ発見を担います。',
  'learning.concept.ndp.q2.prompt': 'SLAAC はどうやって DHCP サーバなしでアドレスを得る？',
  'learning.concept.ndp.q2.a': 'ランダムにアドレスを推測し、衝突しないことを祈る',
  'learning.concept.ndp.q2.b':
    'ルータ広告がプレフィックスを配り、ホストがインタフェース識別子を足す',
  'learning.concept.ndp.q2.c': 'ルータのアドレスをコピーして末尾だけ変える',
  'learning.concept.ndp.q2.why':
    'ステートレス・アドレス自動設定：RA が /64 プレフィックスを運び、ホストがインタフェース識別子（EUI-64 やランダム）を付けてグローバルアドレスを作ります。',
  'learning.concept.ndp.q3.prompt': '重複アドレス検出（DAD）とは？',
  'learning.concept.ndp.q3.a': '使う前にアドレスを暗号化しておく仕組み',
  'learning.concept.ndp.q3.b': '転送のためアドレスを圧縮する方法',
  'learning.concept.ndp.q3.c': '他に同じアドレスを使っている者がいないか確かめる仕組み',
  'learning.concept.ndp.q3.why':
    'DAD はアドレス衝突を防ぎます。仮アドレスを近隣要請（NS）で検証し、応答が返れば既に使用中と判断します。',
};

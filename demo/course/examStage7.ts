import { lessonPath } from '../lessonManifest';
import type { ExamLevel } from './examQuestions';

/**
 * The test of stage 7 (最新とクラウド): TLS 1.3, HTTP/2, HTTP/3 over QUIC, TCP
 * congestion control, and the stage's newer lessons — cloud networks (VPC),
 * SD-WAN, L4S, Encrypted Client Hello and post-quantum key exchange. Ten
 * slots cannot cover every lesson; MASQUE, streaming telemetry and encrypted
 * DNS are not asked. Every answer is what the named lesson shows when run,
 * and what the standard says.
 */
export const EXAM_STAGE_7: ExamLevel = {
  level: 8,
  title: { en: 'Stage 7 · Modern and cloud', ja: 'Level 7・最新とクラウド' },
  summary: {
    en: 'The modern web and cloud: TLS 1.3, HTTP/2, HTTP/3, TCP and L4S, VPCs, SD-WAN, ECH and post-quantum keys.',
    ja: '今の Web とクラウド。TLS 1.3、HTTP/2、HTTP/3、TCP と L4S、VPC、SD-WAN、ECH、耐量子の鍵。',
  },
  path: [
    {
      id: 'https',
      path: lessonPath('/networking/https'),
      title: { en: 'HTTPS TLS 1.3', ja: 'HTTPS（TLS 1.3）' },
      teaches: {
        en: 'The handshake before an encrypted request',
        ja: '暗号化した要求の前のハンドシェイク',
      },
    },
    {
      id: 'http2',
      path: lessonPath('/networking/http2'),
      title: { en: 'HTTP/2 Multiplexing', ja: 'HTTP/2 の多重化' },
      teaches: {
        en: 'Several requests on one connection',
        ja: '1 本の接続に乗る複数の要求',
      },
    },
    {
      id: 'http3',
      path: lessonPath('/networking/http3'),
      title: { en: 'HTTP/3 over QUIC', ja: 'HTTP/3（QUIC）' },
      teaches: {
        en: 'Requests over QUIC instead of TCP',
        ja: 'TCP ではなく QUIC に乗る要求',
      },
    },
    {
      id: 'tcp-congestion',
      path: lessonPath('/simulation/tcp-congestion'),
      title: { en: 'TCP Congestion Control', ja: 'TCP の輻輳制御' },
      teaches: {
        en: 'How fast a sender sends, and what loss does to it',
        ja: '送る速さと、損失がそれをどう変えるか',
      },
    },
    {
      id: 'vpc',
      path: lessonPath('/networking/vpc'),
      title: { en: 'Cloud networks (VPC)', ja: 'クラウドのネットワーク（VPC）' },
      teaches: {
        en: 'Subnets, gateways and a security group',
        ja: 'サブネット、ゲートウェイ、セキュリティグループ',
      },
    },
    {
      id: 'sd-wan',
      path: lessonPath('/networking/sd-wan'),
      title: { en: 'SD-WAN', ja: 'SD-WAN' },
      teaches: {
        en: 'The cheapest link that meets the traffic',
        ja: '通信の条件を満たすいちばん安い回線',
      },
    },
    {
      id: 'l4s',
      path: lessonPath('/networking/l4s'),
      title: { en: 'L4S', ja: 'L4S' },
      teaches: {
        en: 'A full line with a short queue',
        ja: '回線を使い切り、待ち行列は短く',
      },
    },
    {
      id: 'ech',
      path: lessonPath('/networking/ech'),
      title: { en: 'Encrypted Client Hello (ECH)', ja: 'Encrypted Client Hello（ECH）' },
      teaches: {
        en: 'What the first TLS bytes reveal',
        ja: '最初の TLS のバイト列から分かること',
      },
    },
    {
      id: 'post-quantum',
      path: lessonPath('/networking/post-quantum'),
      title: { en: 'Post-quantum key exchange', ja: '耐量子の鍵交換' },
      teaches: {
        en: 'Why browsers send a hybrid key share',
        ja: 'ブラウザがハイブリッドを送る理由',
      },
    },
  ],
  questions: [
    {
      id: 's7-vpc-private-in',
      prompt: {
        en: 'In the VPC lesson, an internet user connects straight to db’s private address 10.0.2.10 on port 80, which the security group allows. What happens?',
        ja: 'VPC のレッスンで、インターネットの利用者が db のプライベートアドレス 10.0.2.10 の 80 番（セキュリティグループが通す番号）に直接つなぎます。どうなりますか？',
      },
      options: [
        { en: 'It reaches db through the NAT gateway', ja: 'NAT ゲートウェイ経由で db に届く' },
        { en: 'It is stopped: nothing maps to it', ja: '止められる。対応づけがない' },
        { en: 'It reaches db, as port 80 is allowed', ja: '80 番が許可なので db に届く' },
        { en: 'It reaches web instead of db', ja: 'db ではなく web に届く' },
      ],
      answer: 1,
      explanation: {
        en: 'A private address has no mapping at the internet gateway, so the connection is dropped (no-nat-entry) before the security group matters. The VPC lesson sends it and shows where it stops.',
        ja: 'プライベートアドレスにはインターネットゲートウェイの対応づけがないので、セキュリティグループの判断より前に落とされます（no-nat-entry）。VPC のレッスンで、実際に送って止まる場所が見られます。',
      },
      taughtBy: 'vpc',
    },
    {
      id: 's7-tls-alpn-hidden',
      prompt: {
        en: 'A middlebox wants to log whether each TLS 1.3 connection ended up using h2 or http/1.1, by reading what the server sends back. Can it?',
        ja: '途中の機器が、TLS 1.3 の接続ごとに h2 と http/1.1 のどちらに決まったかを、サーバから返るものを読んで記録したいとします。できますか？',
      },
      options: [
        { en: 'Yes, the ServerHello names it', ja: 'できる。ServerHello に書いてある' },
        { en: 'Yes, every record header names it', ja: 'できる。どの記録の頭にも書いてある' },
        { en: 'No, the choice is sent encrypted', ja: 'できない。選んだ結果は暗号化して届く' },
        { en: 'No, TLS 1.3 has no ALPN', ja: 'できない。TLS 1.3 に ALPN はない' },
      ],
      answer: 2,
      explanation: {
        en: 'The client’s offer is in the ClientHello, but the server’s choice travels in EncryptedExtensions, which is already encrypted (RFC 8446, RFC 7301). The HTTPS lesson’s trace shows the choice only in tls:encrypted-extensions, after the ServerHello.',
        ja: 'クライアントの候補は ClientHello に入っていますが、サーバが選んだ結果は、すでに暗号化されている EncryptedExtensions で届きます（RFC 8446、RFC 7301）。HTTPS のレッスンの記録でも、選んだ結果は ServerHello のあとの tls:encrypted-extensions にだけ出ます。',
      },
      taughtBy: 'https',
    },
    {
      id: 's7-tls-order',
      prompt: {
        en: 'After the ServerHello, in what order does the server send the rest of a full TLS 1.3 handshake?',
        ja: 'ServerHello のあと、サーバは TLS 1.3 の完全なハンドシェイクの残りを、どの順に送りますか？',
      },
      options: [
        {
          en: 'Certificate → EncryptedExtensions → CertificateVerify → Finished',
          ja: 'Certificate → EncryptedExtensions → CertificateVerify → Finished',
        },
        {
          en: 'EncryptedExtensions → CertificateVerify → Certificate → Finished',
          ja: 'EncryptedExtensions → CertificateVerify → Certificate → Finished',
        },
        {
          en: 'Certificate → CertificateVerify → Finished → EncryptedExtensions',
          ja: 'Certificate → CertificateVerify → Finished → EncryptedExtensions',
        },
        {
          en: 'EncryptedExtensions → Certificate → CertificateVerify → Finished',
          ja: 'EncryptedExtensions → Certificate → CertificateVerify → Finished',
        },
      ],
      answer: 3,
      explanation: {
        en: 'EncryptedExtensions comes first, then the certificate, then CertificateVerify proving the server holds its key, then Finished (RFC 8446). The HTTPS lesson’s annotation list runs in exactly this order, with CertificateVerify between Certificate and Finished.',
        ja: '最初に EncryptedExtensions、次に証明書、そのあとに鍵を持っていることを示す CertificateVerify、最後に Finished です（RFC 8446）。HTTPS のレッスンのやり取りの一覧も、Certificate と Finished の間に CertificateVerify を挟んで、この順に並びます。',
      },
      taughtBy: 'https',
    },
    {
      id: 's7-sdwan-voice',
      prompt: {
        en: 'In the SD-WAN lesson the internet line (cost 1) degrades to 120 ms, 40 ms of jitter and 3 % loss. LTE (cost 2) has 70 ms, 15 ms, 1 %; MPLS (cost 3) 30 ms, 2 ms, 0 %. Voice allows 150 ms, 30 ms and 1 %. Where does voice go?',
        ja: 'SD-WAN のレッスンで、インターネット回線（費用 1）が遅延 120 ms、揺らぎ 40 ms、損失 3 % に悪化します。LTE（費用 2）は 70 ms・15 ms・1 %、MPLS（費用 3）は 30 ms・2 ms・0 % です。音声通話の上限は 150 ms・30 ms・1 % です。音声通話はどこへ？',
      },
      options: [
        { en: 'MPLS, as it is the best', ja: 'MPLS（いちばん良い回線）' },
        { en: 'LTE, the cheapest that meets it', ja: 'LTE（条件内で最安）' },
        { en: 'The internet line, still the cheapest', ja: 'インターネット（いちばん安い）' },
        { en: 'None of them: voice waits', ja: 'どれも使わず待つ' },
      ],
      answer: 1,
      explanation: {
        en: 'SD-WAN picks the cheapest link that meets the traffic’s limits: the internet line misses on jitter and loss, and LTE meets all three for less than MPLS. The SD-WAN lesson makes the same choice at 18:00.',
        ja: 'SD-WAN は、通信の上限を満たす中でいちばん安い回線を選びます。インターネット回線は揺らぎと損失で外れ、LTE は 3 つとも満たして MPLS より安いからです。SD-WAN のレッスンでも、18:00 に同じ選び方をします。',
      },
      taughtBy: 'sd-wan',
    },
    {
      id: 's7-ech-observer',
      prompt: {
        en: 'With Encrypted Client Hello, what can a device on the café’s Wi-Fi read in a browser’s first TLS bytes?',
        ja: 'Encrypted Client Hello を使うと、カフェの Wi-Fi にいる機器は、ブラウザの最初の TLS のバイト列から何を読めますか？',
      },
      options: [
        { en: 'The real site’s name, as before', ja: '本物のサイト名（今までどおり）' },
        { en: 'Only the provider’s public name', ja: '事業者の公開名だけ' },
        { en: 'The page being requested', ja: '要求しているページ' },
        { en: 'No name of any kind', ja: '名前は何も読めない' },
      ],
      answer: 1,
      explanation: {
        en: 'The outer ClientHello names only the provider’s public name, shared by all its sites; the real hello is sealed with a key the provider published in DNS. The ECH lesson shows the bytes with and without ECH.',
        ja: '外側の ClientHello に書かれるのは、全サイト共通の事業者の公開名だけで、本物の ClientHello は事業者が DNS に公開した鍵で封をされています。ECH のレッスンで、ECH のありとなしのバイト列が見られます。',
      },
      taughtBy: 'ech',
    },
    {
      id: 's7-h2-stream-ids',
      prompt: {
        en: 'In the HTTP/2 lesson the client opens four streams for /a to /d. Which stream IDs do they use?',
        ja: 'HTTP/2 のレッスンで、クライアントが /a〜/d のために 4 本のストリームを開きます。使うストリーム ID はどれですか？',
      },
      options: [
        { en: '0, 1, 2 and 3', ja: '0、1、2、3' },
        { en: '1, 3, 5 and 7', ja: '1、3、5、7' },
        { en: '2, 4, 6 and 8', ja: '2、4、6、8' },
        { en: '0, 4, 8 and 12', ja: '0、4、8、12' },
      ],
      answer: 1,
      explanation: {
        en: 'In HTTP/2 the client opens streams with odd IDs and the server with even ones, and 0 is the connection itself (RFC 9113), so the four requests are 1, 3, 5 and 7. 0, 4, 8 and 12 are what HTTP/3 uses. The HTTP/2 lesson’s frame list shows stream=1, 3, 5 and 7.',
        ja: 'HTTP/2 では、クライアントが開くストリームは奇数、サーバは偶数で、0 は接続そのものです（RFC 9113）。だから 4 つの要求は 1、3、5、7 です。0、4、8、12 は HTTP/3 の番号です。HTTP/2 のレッスンのフレームの一覧に stream=1、3、5、7 が出ます。',
      },
      taughtBy: 'http2',
    },
    {
      id: 's7-h3-stream-ids',
      prompt: {
        en: 'The same four requests go over HTTP/3. Why are their stream IDs 0, 4, 8 and 12, counting up in fours?',
        ja: '同じ 4 つの要求を HTTP/3 で送ります。ストリーム ID が 0、4、8、12 と 4 ずつ増えるのはなぜですか？',
      },
      options: [
        { en: 'Each request needs four streams', ja: '要求 1 つに 4 本のストリームが要るから' },
        { en: 'The server skips the IDs in between', ja: 'サーバが間の番号を飛ばすから' },
        { en: 'Two low bits say who opened it', ja: '下 2 ビットが送り手と向きを表すから' },
        { en: 'Four bytes are added for each stream', ja: 'ストリームごとに 4 バイト増えるから' },
      ],
      answer: 2,
      explanation: {
        en: 'In QUIC the two lowest bits of a stream ID say who opened it and whether it is bidirectional; client-opened bidirectional streams end in 00, so they count up in fours (RFC 9000). The HTTP/3 lesson explains its 0, 4, 8 and 12 this way.',
        ja: 'QUIC では、ストリーム ID の下 2 ビットが、だれが開いたかと、双方向かどうかを表します。クライアントが開く双方向のストリームは下 2 ビットが 00 なので、4 ずつ増えます（RFC 9000）。HTTP/3 のレッスンも、0、4、8、12 をこう説明します。',
      },
      taughtBy: 'http3',
    },
    {
      id: 's7-pq-hybrid',
      prompt: {
        en: 'Browsers send the hybrid X25519MLKEM768 rather than ML-KEM-768 alone. Why?',
        ja: 'ブラウザは ML-KEM-768 単独ではなく、ハイブリッドの X25519MLKEM768 を送ります。なぜですか？',
      },
      options: [
        { en: 'ML-KEM alone is too slow', ja: 'ML-KEM だけでは遅すぎる' },
        { en: 'Servers do not know ML-KEM', ja: 'サーバが ML-KEM を知らない' },
        { en: 'It falls only if both parts do', ja: '両方が破られない限り守れる' },
        { en: 'X25519 makes the share smaller', ja: 'X25519 で鍵の材料が小さくなる' },
      ],
      answer: 2,
      explanation: {
        en: 'X25519 alone falls to a future quantum computer; ML-KEM alone is young, and a flaw found in it would expose everything. The hybrid derives its key from both, so it falls only if both do. The post-quantum lesson tables all three.',
        ja: 'X25519 だけでは将来の量子コンピュータに破られ、ML-KEM だけではまだ新しく、欠陥が見つかればすべて漏れます。ハイブリッドは両方から鍵を作るので、両方が破られない限り守れます。耐量子の鍵交換のレッスンで、3 つを表で比べられます。',
      },
      taughtBy: 'post-quantum',
    },
    {
      id: 's7-cc-rto-ssthresh',
      prompt: {
        en: 'MSS is 1000 bytes. A retransmission timeout fires with 2000 bytes sent and not yet acknowledged. What becomes the new ssthresh?',
        ja: 'MSS は 1000 バイトです。送ったまま確認の取れていないデータが 2000 バイトあるときに、再送タイムアウトが起きました。新しい ssthresh はいくつですか？',
      },
      options: [
        { en: '1000 bytes, half of 2000', ja: '1000 バイト（2000 の半分）' },
        { en: '4000 bytes, as it was', ja: '4000 バイト（元のまま）' },
        { en: '500 bytes, a quarter', ja: '500 バイト（4 分の 1）' },
        { en: '2000 bytes, two segments', ja: '2000 バイト（2 セグメント分）' },
      ],
      answer: 3,
      explanation: {
        en: 'ssthresh = max(data in flight ÷ 2, 2 × MSS) = max(1000, 2000) = 2000 bytes (RFC 5681, equation 4); half of 2000 would fall below the two-segment floor. The congestion lesson’s readout at the timeout writes out this formula with 2000 bytes in flight.',
        ja: 'ssthresh = max(未確認のデータ ÷ 2, 2 × MSS) = max(1000, 2000) = 2000 バイトです（RFC 5681 の式 4）。2000 の半分では、下限の 2 セグメントを下回ります。輻輳制御のレッスンでも、タイムアウトの所で、未確認 2000 バイトとしてこの式が示されます。',
      },
      taughtBy: 'tcp-congestion',
    },
    {
      id: 's7-l4s-both',
      prompt: {
        en: 'In the L4S lesson one bottleneck is run three ways. Which keeps the line full and the queue short at the same time?',
        ja: 'L4S のレッスンでは、1 つのボトルネックを 3 通りで走らせます。回線を使い切りながら、待ち行列も短く保てるのはどれですか？',
      },
      options: [
        { en: 'L4S, told early by ECN marks', ja: 'L4S（早めの ECN の印）' },
        { en: 'Classic TCP with a deep buffer', ja: '従来の TCP・深いバッファ' },
        { en: 'Classic TCP with a shallow buffer', ja: '従来の TCP・浅いバッファ' },
        { en: 'None: it is always one or the other', ja: 'どれでもない。必ずどちらか一方' },
      ],
      answer: 0,
      explanation: {
        en: 'A deep buffer fills the line but lets delay reach 20 ms; a shallow one keeps delay low but leaves the line 85 % used. L4S backs off by its marks while the queue is short: 100 % used, worst 5.8 ms. The L4S lesson runs all three.',
        ja: '深いバッファは回線を埋めますが遅延が 20 ms まで伸び、浅いバッファは遅延が小さい代わりに使用率が 85 % にとどまります。L4S は待ち行列が短いうちに印の数だけ減らすので、使用率 100 %、最大 5.8 ms です。L4S のレッスンで 3 つを走らせられます。',
      },
      taughtBy: 'l4s',
    },
  ],
};

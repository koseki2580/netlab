import { lessonPath } from '../lessonManifest';
import type { ExamLevel } from './examQuestions';

/**
 * The test of stage 7 (最新とクラウド): what the stage's lessons teach today —
 * TLS 1.3, HTTP/2, HTTP/3 over QUIC and TCP congestion control. Topics the
 * stage lists as coming soon are not asked. Every answer is what the named
 * lesson shows when run, and what the RFC says (RFC 8446, 9113, 9000/9114,
 * 5681).
 */
export const EXAM_STAGE_7: ExamLevel = {
  level: 8,
  title: { en: 'Stage 7 · Modern and cloud', ja: '段階 7・最新とクラウド' },
  summary: {
    en: 'The modern web: TLS 1.3, HTTP/2, HTTP/3 over QUIC, and how TCP reacts to loss.',
    ja: '今の Web。TLS 1.3、HTTP/2、QUIC 上の HTTP/3、TCP の損失への対応。',
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
  ],
  questions: [
    {
      id: 's7-tls-clear',
      prompt: {
        en: 'A device on the path records a TLS 1.3 handshake between a browser and a server. Which part of the server’s side can it read in the clear?',
        ja: '経路の途中の機器が、ブラウザとサーバの TLS 1.3 のハンドシェイクを記録しました。サーバ側から送られたもののうち、暗号化されずに読めるのはどれですか？',
      },
      options: [
        { en: 'The server’s certificate', ja: 'サーバが送る証明書' },
        { en: 'Its ServerHello and its key share', ja: 'ServerHello の中身' },
        { en: 'The proof that it owns the key', ja: '鍵の持ち主であることの証明' },
        { en: 'The application protocol it chose', ja: 'サーバが選んだアプリケーションの種類' },
      ],
      answer: 1,
      explanation: {
        en: 'In TLS 1.3 everything the server sends after the ServerHello is encrypted, including EncryptedExtensions, the certificate and CertificateVerify (RFC 8446). Only the ServerHello — its key share, the version and the cipher — is in the clear. The HTTPS lesson’s brief draws the line at the same place.',
        ja: 'TLS 1.3 では、サーバが ServerHello のあとに送るものは、EncryptedExtensions、証明書、CertificateVerify を含めてすべて暗号化されます（RFC 8446）。暗号化されずに読めるのは ServerHello（鍵の材料、版、暗号方式）だけです。HTTPS のレッスンの説明も、同じ所で線を引いています。',
      },
      taughtBy: 'https',
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
      id: 's7-tls-first-data',
      prompt: {
        en: 'In the HTTPS lesson’s successful handshake, when does the first application data — the HTTP request — appear?',
        ja: 'HTTPS のレッスンで成功したハンドシェイクでは、最初のアプリケーションのデータ（HTTP の要求）はいつ出てきますか？',
      },
      options: [
        { en: 'Inside the ClientHello', ja: 'ClientHello の中' },
        { en: 'Right after the ServerHello', ja: 'ServerHello の直後' },
        { en: 'After both sides’ Finished', ja: '双方の Finished 後' },
        { en: 'Before the TLS handshake starts', ja: 'TLS のハンドシェイクの前' },
      ],
      answer: 2,
      explanation: {
        en: 'In a full handshake the client sends application data once the server’s Finished has arrived and it has sent its own Finished (RFC 8446; only a resumed connection can send early data). The lesson’s list ends tls:finished (server), tls:finished (client), then tls:application-data.',
        ja: '完全なハンドシェイクでは、サーバの Finished を受け取り、自分の Finished を送ってから、クライアントはアプリケーションのデータを送ります（RFC 8446。早期データを送れるのは再開した接続だけです）。レッスンの一覧は tls:finished（server）、tls:finished（client）、tls:application-data の順で終わります。',
      },
      taughtBy: 'https',
    },
    {
      id: 's7-h2-one-connection',
      prompt: {
        en: 'A browser fetches /a, /b, /c and /d from one server over HTTP/2. A firewall counts TCP connections. How many does it see for these four requests?',
        ja: 'ブラウザが 1 台のサーバから /a、/b、/c、/d を HTTP/2 で取得します。ファイアウォールが TCP 接続の数を数えます。この 4 つの要求で、いくつ数えますか？',
      },
      options: [
        { en: 'Four, one per request', ja: '4 本（要求ごとに 1 本）' },
        { en: 'Two, one each way', ja: '2 本（行きと帰りで 1 本ずつ）' },
        { en: 'One, shared by all', ja: '1 本（4 つで共有）' },
        { en: 'None, HTTP/2 uses UDP', ja: '0 本（HTTP/2 は UDP を使う）' },
      ],
      answer: 2,
      explanation: {
        en: 'HTTP/2 multiplexes requests as streams over a single TCP connection (RFC 9113) — which is also why one lost packet stalls every stream. The HTTP/2 lesson sends the four requests as four streams over one TCP connection.',
        ja: 'HTTP/2 は要求をストリームとして、1 本の TCP 接続に多重化します（RFC 9113）。1 つのパケットのロスで全ストリームが止まるのも、このためです。HTTP/2 のレッスンでも、4 つの要求は 1 本の TCP 接続の上の 4 本のストリームです。',
      },
      taughtBy: 'http2',
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
      id: 's7-h3-udp-firewall',
      prompt: {
        en: 'A firewall allows TCP port 443 and blocks all UDP. A browser tries the same site over HTTP/2 and over HTTP/3. Which can connect?',
        ja: 'ファイアウォールが TCP の 443 番ポートは通し、UDP はすべて止めています。ブラウザが同じサイトに HTTP/2 と HTTP/3 で接続しようとします。つながるのはどれですか？',
      },
      options: [
        { en: 'Only HTTP/2', ja: 'HTTP/2 だけ' },
        { en: 'Only HTTP/3', ja: 'HTTP/3 だけ' },
        { en: 'Both of them', ja: '両方ともつながる' },
        { en: 'Neither of them', ja: 'どちらもつながらない' },
      ],
      answer: 0,
      explanation: {
        en: 'HTTP/2 runs over TCP, which the firewall allows on 443. HTTP/3 runs over QUIC, and QUIC runs over UDP (RFC 9000, RFC 9114), which is blocked; a real browser then falls back to HTTP/2. The HTTP/3 lesson’s brief says HTTP/3 runs over QUIC over UDP instead of TCP.',
        ja: 'HTTP/2 は TCP の上で動き、ファイアウォールは 443 番を通します。HTTP/3 は QUIC の上で動き、QUIC は UDP の上で動く（RFC 9000、RFC 9114）ので止められます。実際のブラウザは、そのとき HTTP/2 に戻ります。HTTP/3 のレッスンの説明にも、HTTP/3 は TCP ではなく UDP の上の QUIC で動くとあります。',
      },
      taughtBy: 'http3',
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
      id: 's7-cc-deflate',
      prompt: {
        en: 'A sender is in fast recovery after three duplicate ACKs. Then a new ACK arrives that covers the resent segment. What happens to cwnd?',
        ja: '送り手が、重複 ACK 3 つのあと高速回復に入っています。そこへ、再送したセグメントを確認する新しい ACK が届きました。cwnd はどうなりますか？',
      },
      options: [
        { en: 'It drops back to one segment', ja: '1 セグメント分に戻る' },
        { en: 'It shrinks to ssthresh', ja: 'ssthresh まで縮む' },
        { en: 'It doubles at once', ja: 'その場で 2 倍になる' },
        { en: 'It stays where it was', ja: 'いまの値のまま、何も変わらない' },
      ],
      answer: 1,
      explanation: {
        en: 'The new ACK ends fast recovery, and cwnd is deflated to ssthresh; it drops to one segment only after a timeout (RFC 5681). The congestion lesson’s step for that ACK reads "the new ACK ends fast recovery: cwnd deflates to ssthresh".',
        ja: '新しい ACK で高速回復が終わり、cwnd は ssthresh まで縮みます。1 セグメントに戻るのはタイムアウトのときだけです（RFC 5681）。輻輳制御のレッスンでも、その ACK のステップに「新しい ACK で高速回復が終わり、cwnd は ssthresh まで縮む」と出ます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
};

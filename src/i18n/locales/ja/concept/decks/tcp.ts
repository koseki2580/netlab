import type { Catalog } from '../../../../types';

/** The `tcp` deck's questions (ja); its name is in the core chunk. */
export const tcp: Catalog = {
  'learning.concept.tcp.q1.prompt': 'TCP 3ウェイハンドシェイクの順序は…',
  'learning.concept.tcp.q1.a': 'SYN, SYN-ACK, ACK',
  'learning.concept.tcp.q1.b': 'ACK, SYN, FIN',
  'learning.concept.tcp.q1.c': 'SYN, ACK, SYN',
  'learning.concept.tcp.q1.why':
    'クライアントが SYN、サーバが SYN-ACK、クライアントが ACK — これで接続確立です。',
  'learning.concept.tcp.q2.prompt': 'TCP が保証するのは…',
  'learning.concept.tcp.q2.a': '可能な限り低い遅延',
  'learning.concept.tcp.q2.b': '信頼性のある順序通りの配送',
  'learning.concept.tcp.q2.c': 'ペイロードの暗号化',
  'learning.concept.tcp.q2.why':
    'シーケンス番号・確認応答・再送が信頼性のある順序通りの配送を実現します。暗号化は TLS の役割です。',
  'learning.concept.tcp.q3.prompt': 'TCP 接続を正常に閉じるのは？',
  'learning.concept.tcp.q3.a': 'RST セグメント',
  'learning.concept.tcp.q3.b': '2度目の SYN',
  'learning.concept.tcp.q3.c': 'FIN の交換',
  'learning.concept.tcp.q3.why':
    '双方が FIN を送り相手の FIN を ACK します。RST は突然の中断で正常終了ではありません。',
  'learning.concept.tcp.q4.prompt': 'TCP セグメントが失われると、TCP は…',
  'learning.concept.tcp.q4.a': '再送する',
  'learning.concept.tcp.q4.b': '無視する',
  'learning.concept.tcp.q4.c': '接続を閉じる',
  'learning.concept.tcp.q4.why':
    '確認応答の欠落が再送を起こします — これが信頼性のない網で TCP が確実に届ける仕組みです。',
  'learning.concept.tcp.q5.prompt': 'TCP のフロー制御と輻輳制御の目的は…',
  'learning.concept.tcp.q5.a': '受信側だけが読めるようデータを暗号化するため',
  'learning.concept.tcp.q5.b': '受信側と網を溢れさせないため',
  'learning.concept.tcp.q5.c': '両端に IP を割り当てるため',
  'learning.concept.tcp.q5.why':
    'ウィンドウが送信速度を受信側のバッファと網の輻輳信号に合わせて調整します。',
  'learning.concept.tcp.q1.b.why': 'FIN は接続を切断します。確立は SYN → SYN-ACK → ACK です。',
  'learning.concept.tcp.q1.c.why': '中間は SYN-ACK の結合で、ACK は最後です：SYN → SYN-ACK → ACK。',
  'learning.concept.tcp.q2.a.why':
    'TCP は信頼性（再送・順序）のために少しの遅延を引き換えにします。低遅延を選ぶなら UDP です。',
  'learning.concept.tcp.q2.c.why':
    'TCP は暗号化しません — それは上位の TLS です。TCP は信頼性のある順序通りのバイト列を保証します。',
  'learning.concept.tcp.q3.a.why':
    'RST はエラー用です — 拒否されたポートや壊れた接続を即座に打ち切り、FIN 交換を一切踏みません。',
  'learning.concept.tcp.q3.b.why':
    '2度目の SYN は確立しようとするもので切断ではありません。正常な切断は双方向の FIN/ACK です。',
  'learning.concept.tcp.q4.b.why':
    'TCP は損失を単に無視しません — それでは信頼性が壊れます。欠けたセグメントを再送します。',
  'learning.concept.tcp.q4.c.why':
    '1 回の損失は再送のトリガーであって切断ではありません。TCP は本当の障害時のみ切断します。',
  'learning.concept.tcp.q5.a.why':
    '暗号化は TLS の役割です。フロー制御と輻輳制御は受信側と網に合わせて送信側を調整します。',
  'learning.concept.tcp.q5.c.why':
    'IP アドレスの割り当ては DHCP です。TCP のウィンドウは過負荷を避けるため送信速度を絞ります。',
};

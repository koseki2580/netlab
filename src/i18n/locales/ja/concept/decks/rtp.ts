import type { Catalog } from '../../../../types';

/** The `rtp` deck's questions (ja); its name is in the core chunk. */
export const rtp: Catalog = {
  'learning.concept.rtp.q1.b.why':
    '到達性を配るのはルーティングプロトコルです。RTP はリアルタイムメディアを主に UDP で運びます。',
  'learning.concept.rtp.q1.c.why':
    'メールは SMTP/IMAP です。RTP はリアルタイムの音声/映像を、シーケンス番号とタイムスタンプ付きで UDP 上に運びます。',
  'learning.concept.rtp.q2.a.why':
    'TCP も音声を運べますが、再送が遅すぎて役に立ちません。RTP は UDP の低遅延を選びます。',
  'learning.concept.rtp.q2.c.why':
    'UDP は暗号化されません（暗号化は SRTP）。RTP は確実さより適時性が勝るため UDP を使います。',
  'learning.concept.rtp.q3.a.why':
    'RTCP は暗号化ではありません（それは SRTP）。ジッタ・損失・往復時間などの品質フィードバックを運びます。',
  'learning.concept.rtp.q3.b.why':
    'RTCP はメディアを複製しません。送信側が適応できるよう統計（ジッタ・損失・往復時間）を報告します。',
  'learning.concept.rtp.q1.prompt': 'RTP は何を、どのトランスポートで運ぶ？',
  'learning.concept.rtp.q1.a': 'リアルタイムの音声/映像メディアを、通常 UDP 上で運ぶ',
  'learning.concept.rtp.q1.b': 'ルーティングテーブルの更新を TCP で運ぶ',
  'learning.concept.rtp.q1.c': 'メールと添付ファイルを TLS で運ぶ',
  'learning.concept.rtp.q1.why':
    'RTP はシーケンス番号とタイムスタンプを付け、受信側が並べ替え・損失検出・正しいタイミングでの再生をできるようにします。',
  'learning.concept.rtp.q2.prompt': 'RTP が TCP ではなく UDP を使うことが多いのはなぜ？',
  'learning.concept.rtp.q2.a': 'TCP は音声や映像のストリームを運べないから',
  'learning.concept.rtp.q2.b': 'ライブメディアでは遅れて届いた再送が役に立たないから',
  'learning.concept.rtp.q2.c': 'UDP がメディアを既定で暗号化するから',
  'learning.concept.rtp.q2.why':
    'ライブメディアでは遅すぎるパケットは再生できないため、TCP の再送/順序付けは有害な遅延になります。RTP は代わりに損失を補間します。',
  'learning.concept.rtp.q3.prompt': 'RTP ストリームに加えて RTCP が提供するのは？',
  'learning.concept.rtp.q3.a': 'メディアをより強く暗号化する',
  'learning.concept.rtp.q3.b': 'メディアストリーム全体のバックアップ',
  'learning.concept.rtp.q3.c': '送信側向けの制御・品質フィードバック',
  'learning.concept.rtp.q3.why':
    'RTCP は受信品質（ジッタ・パケット損失・往復時間）を定期的に報告し、エンドポイントがビットレート調整や問題診断をできるようにします（RTP のデータに対する制御）。',
};

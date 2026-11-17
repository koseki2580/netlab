import { useState } from 'react';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  ATTACKERS,
  CODEPOINT,
  GROUPS,
  MSS,
  SHARE,
  clientHelloBytes,
  segmentsFor,
  staysSecret,
  type Attacker,
  type Group,
} from './pqKex';

const NAME: Record<Group, string> = {
  x25519: 'X25519',
  mlkem768: 'ML-KEM-768',
  x25519mlkem768: 'X25519MLKEM768',
};

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function PqKexLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Group | null>(null);
  const [revealed, setRevealed] = useState(false);
  const always = GROUPS.filter((group) => ATTACKERS.every((a) => staysSecret(group, a)));
  const right = guess !== null && always.includes(guess);
  const attackerName = (attacker: Attacker) =>
    ({
      classical: t('Today’s computers', '今のコンピュータ'),
      quantum: t('A future quantum computer', '将来の量子コンピュータ'),
      'mlkem-flaw': t('A flaw found in ML-KEM', 'ML-KEM に欠陥が見つかる'),
    })[attacker];

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gap: 12,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Post-quantum key exchange', '耐量子の鍵交換')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Someone can record your encrypted traffic today and keep it. If a large quantum computer is built later, it can solve X25519’s elliptic-curve problem and recover the session key — “harvest now, decrypt later”. ML-KEM (FIPS 203) is a key exchange built on a lattice problem with no known quantum shortcut. Browsers now offer the hybrid X25519MLKEM768 in TLS 1.3 by default: both are run, and the session key is derived from both secrets.',
            '暗号化された通信は、今のうちに記録して取っておくことができます。将来、大きな量子コンピュータができれば、X25519 の楕円曲線の問題を解いてセッションの鍵を取り出せます。これが「今集めて、あとで解読」です。ML-KEM（FIPS 203）は、量子でも速く解く方法が知られていない格子の問題に基づく鍵交換です。今のブラウザは TLS 1.3 で、ハイブリッドの X25519MLKEM768 を標準で提案します。両方を行い、セッションの鍵を両方の秘密から作ります。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="pq-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'A session is recorded today. Which key exchange keeps its key secret against today’s computers, a future quantum computer, and a flaw found later in ML-KEM, all three?',
            '今日の通信が記録されたとします。今のコンピュータ、将来の量子コンピュータ、あとで ML-KEM に見つかる欠陥、この 3 つすべてに対して鍵を守れるのはどれ？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              role="radio"
              aria-checked={guess === group}
              data-testid={`pq-guess-${group}`}
              disabled={revealed}
              onClick={() => setGuess(group)}
              style={{
                ...LESSON_BUTTON,
                outline: guess === group ? '2px solid var(--netlab-accent-cyan)' : undefined,
              }}
            >
              {NAME[group]}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="pq-reveal"
            data-right={String(right)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {right
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              'Only the hybrid. X25519 alone falls to a quantum computer; ML-KEM alone is still young, and a flaw found in it would expose everything it protected. The hybrid falls only if both do — the reason it, not ML-KEM alone, is what browsers send.',
              'ハイブリッドだけです。X25519 だけでは量子コンピュータに破られます。ML-KEM だけでは、まだ新しい方式なので、欠陥が見つかれば守っていたものがすべて漏れます。ハイブリッドは両方が破られない限り破られません。ブラウザが ML-KEM 単独ではなくハイブリッドを送るのはこのためです。',
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="pq-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See the answer', '答えを見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="pq-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell} />
                {GROUPS.map((group) => (
                  <th key={group} style={cell}>
                    {NAME[group]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ATTACKERS.map((attacker) => (
                <tr key={attacker}>
                  <td style={cell}>{attackerName(attacker)}</td>
                  {GROUPS.map((group) => {
                    const holds = staysSecret(group, attacker);
                    return (
                      <td
                        key={group}
                        data-testid={`pq-${group}-${attacker}`}
                        data-holds={String(holds)}
                        style={{ ...cell, fontWeight: holds ? 400 : 700 }}
                      >
                        {holds
                          ? t('✓ stays secret', '✓ 守れる')
                          : t('✕ key recovered', '✕ 鍵が漏れる')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="pq-sizes">
          <div style={LESSON_LABEL}>{t('The price: size', '代わりに増えるもの：大きさ')}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Group (code)', 'グループ（番号）')}</th>
                <th style={cell}>{t('Client sends', 'クライアントが送る')}</th>
                <th style={cell}>{t('Server returns', 'サーバが返す')}</th>
                <th style={cell}>ClientHello</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => {
                const bytes = clientHelloBytes(group);
                return (
                  <tr key={group} data-testid={`pq-size-${group}`}>
                    <td style={cell}>
                      {NAME[group]}{' '}
                      <span style={{ fontFamily: 'monospace' }}>
                        {`0x${CODEPOINT[group].toString(16).padStart(4, '0')}`}
                      </span>
                    </td>
                    <td
                      style={{ ...cell, fontFamily: 'monospace' }}
                    >{`${SHARE[group].client} B`}</td>
                    <td
                      style={{ ...cell, fontFamily: 'monospace' }}
                    >{`${SHARE[group].server} B`}</td>
                    <td style={{ ...cell, fontFamily: 'monospace' }}>
                      {t(
                        `≈ ${bytes} B, ${segmentsFor(bytes)} TCP segment${segmentsFor(bytes) > 1 ? 's' : ''}`,
                        `約 ${bytes} B、TCP セグメント ${segmentsFor(bytes)} 個`,
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `With the hybrid the ClientHello no longer fits one ${MSS}-byte segment, so it arrives in two. Middleboxes that expected the whole ClientHello in the first packet broke when browsers turned this on; they had to be fixed. QUIC carries it in more than one Initial packet for the same reason.`,
              `ハイブリッドでは ClientHello が ${MSS} バイトのセグメント 1 つに収まらず、2 つに分かれて届きます。ClientHello 全体が最初のパケットに入っていると決めつけていた途中の機器は、ブラウザがこれを有効にしたときに動かなくなり、修正が必要になりました。QUIC でも同じ理由で、Initial パケット 2 つ以上に分けて運びます。`,
            )}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'The ClientHello size apart from the key share is a typical browser’s, about 480 bytes. Certificates and signatures are a separate question: post-quantum signatures (ML-DSA) are not yet in everyday use.',
              '鍵の材料以外の ClientHello の大きさは、一般的なブラウザのもの（約 480 バイト）です。証明書と署名は別の話で、耐量子の署名（ML-DSA）はまだ日常的には使われていません。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function PqKexDemo() {
  return (
    <DemoShell
      title="Post-quantum key exchange"
      desc="X25519, ML-KEM and the hybrid browsers send: what each protects against, and what it costs in bytes"
    >
      <PqKexLesson />
    </DemoShell>
  );
}

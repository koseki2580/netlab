import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  ALTERED_ADDRESS,
  DEFAULT_NOW_DAY,
  MAX_DAY,
  QUERY_NAME,
  SCENARIOS,
  SIGNED_ADDRESS,
  received,
  validate,
  type ScenarioId,
  type Step,
  type Validation,
  type Verdict,
} from './dnssec';

const VERDICTS: readonly Verdict[] = ['secure', 'insecure', 'bogus'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
  verticalAlign: 'top',
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const NO_GUESSES: Record<ScenarioId, Verdict | null> = {
  secure: null,
  tampered: null,
  'no-ds': null,
  expired: null,
};
const NONE_REVEALED: Record<ScenarioId, boolean> = {
  secure: false,
  tampered: false,
  'no-ds': false,
  expired: false,
};

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function DnssecLesson() {
  const t = useT();
  const [scenario, setScenario] = useState<ScenarioId>('tampered');
  const [guesses, setGuesses] = useState(NO_GUESSES);
  const [revealed, setRevealed] = useState(NONE_REVEALED);
  const [nowDay, setNowDay] = useState(DEFAULT_NOW_DAY);

  const guess = guesses[scenario];
  const shown = revealed[scenario];
  const validation = validate(scenario);
  const answerWindow = received('expired').answer.rrsig;
  const clock = validate('expired', nowDay);

  const scenarioName = (id: ScenarioId) =>
    ({
      secure: t('As published', 'そのまま届く'),
      tampered: t('Changed on the way', '途中で書き換え'),
      'no-ds': t('No DS in the parent', '親に DS がない'),
      expired: t('Old signature', '古い署名'),
    })[id];
  const scenarioStory = (id: ScenarioId) =>
    ({
      secure: t(
        `The resolver receives the A record of ${QUERY_NAME}, and every DS record and signature along the way, exactly as the zones published them. The validator’s clock says day ${DEFAULT_NOW_DAY}.`,
        `リゾルバは ${QUERY_NAME} の A レコードと、途中の DS レコードと署名をすべて、各ゾーンが公開したとおりに受け取りました。検証する側の時計は ${DEFAULT_NOW_DAY} 日目です。`,
      ),
      tampered: t(
        `On the way to the resolver, the address in the A record of ${QUERY_NAME} was changed from ${SIGNED_ADDRESS} to ${ALTERED_ADDRESS}. The RRSIG that came with it was left as it was. Everything else arrived as published.`,
        `リゾルバへ届く途中で、${QUERY_NAME} の A レコードのアドレスが ${SIGNED_ADDRESS} から ${ALTERED_ADDRESS} に書き換えられました。いっしょに届いた RRSIG はそのままです。ほかはすべて公開されたとおりに届きました。`,
      ),
      'no-ds': t(
        'shop.example. signs its records, but its parent example. publishes no DS record for it, and proves that with a signed NSEC record. Everything that does arrive is as published.',
        'shop.example. は自分のレコードに署名していますが、親の example. は shop.example. の DS レコードを公開しておらず、そのことを署名付きの NSEC レコードで示しています。届いたものはすべて公開されたとおりです。',
      ),
      expired: t(
        `shop.example.’s re-signing job stopped. The RRSIG on the A record was made for days ${answerWindow.inception}–${answerWindow.expiration}; the validator’s clock says day ${DEFAULT_NOW_DAY}. The record itself was not changed.`,
        `shop.example. の再署名の処理が止まっていました。A レコードの RRSIG の有効期間は ${answerWindow.inception}〜${answerWindow.expiration} 日目で、検証する側の時計は ${DEFAULT_NOW_DAY} 日目です。レコードそのものは書き換えられていません。`,
      ),
    })[id];
  const verdictName = (verdict: Verdict) =>
    ({
      secure: t(
        'Secure: answered and marked as verified',
        'Secure：答えが返り、検証済みの印が付く',
      ),
      insecure: t(
        'Insecure: answered, but not verified',
        'Insecure：答えは返るが、検証されていない',
      ),
      bogus: t(
        'Bogus: rejected, the client gets SERVFAIL',
        'Bogus：拒否され、クライアントには SERVFAIL',
      ),
    })[verdict];
  const verdictWord = (verdict: Verdict) =>
    ({ secure: 'Secure', insecure: 'Insecure', bogus: 'Bogus' })[verdict];
  const stepName = (step: Step) => {
    if (step.kind === 'anchor')
      return t(
        'The root’s DNSKEY matches the trust anchor',
        'ルートの DNSKEY がトラストアンカーと一致する',
      );
    if (step.kind === 'ds-match')
      return t(
        `${step.zone}’s DNSKEY matches the DS in its parent`,
        `${step.zone} の DNSKEY が親の DS と一致する`,
      );
    return t(
      `${step.zone}’s key verifies the RRSIG over ${step.subject}`,
      `${step.zone} の鍵で ${step.subject} の RRSIG を確かめる`,
    );
  };
  const resultName = (step: Step) =>
    ({
      pass: t('✓ pass', '✓ 合格'),
      fail:
        step.failure === 'expired'
          ? t('✗ expired', '✗ 期限切れ')
          : step.failure === 'not-yet-valid'
            ? t('✗ not yet valid', '✗ まだ有効でない')
            : t('✗ mismatch', '✗ 不一致'),
      'no-ds': t('no DS: chain ends', 'DS なし：ここで終わり'),
      skipped: t('— not checked', '— 確認しない'),
    })[step.result];
  const detail = (step: Step) => {
    if (step.computed === undefined) return '';
    const relation = step.computed === step.expected ? '=' : '≠';
    const days = step.window
      ? t(
          ` · days ${step.window.inception}–${step.window.expiration}`,
          ` · ${step.window.inception}〜${step.window.expiration} 日目`,
        )
      : '';
    return `${step.computed} ${relation} ${step.expected}${days}`;
  };

  const explain = (v: Validation) => {
    const stopped = v.stoppedAt === null ? null : v.steps[v.stoppedAt - 1]!;
    if (!stopped)
      return t(
        `Secure. All ${v.steps.length} checks pass, from the root’s key (matched against the trust anchor the resolver was configured with) down to the signature on the A record. The client gets ${v.address} with the AD flag set.`,
        `Secure です。リゾルバに設定されたトラストアンカーと一致するルートの鍵から、A レコードの署名まで、${v.steps.length} つの確認がすべて合格します。クライアントには ${v.address} が AD フラグ付きで返ります。`,
      );
    if (stopped.result === 'no-ds')
      return t(
        `Insecure. Steps 1–3 pass, but at step ${stopped.id} example. has no DS for shop.example., so there is nothing to check shop.example.’s key against, and its signatures cannot be trusted or distrusted. The client gets ${v.address}, without the AD flag. Without the signed proof that the DS is absent, the resolver would have to treat the answer as Bogus instead.`,
        `Insecure です。手順 1〜3 は合格しますが、手順 ${stopped.id} で example. に shop.example. の DS がありません。shop.example. の鍵を照らし合わせる相手がないので、その署名は信じることも疑うこともできません。クライアントには ${v.address} が AD フラグなしで返ります。DS がないことを示す署名付きの証明がなければ、リゾルバはこの答えを Bogus として扱うしかありません。`,
      );
    if (stopped.failure === 'mismatch')
      return t(
        `Bogus. Steps 1–${stopped.id - 1} pass, but step ${stopped.id} fails: the record that arrived, checked with ${stopped.zone}’s key, gives ${stopped.computed}, while the RRSIG holds ${stopped.expected}. The resolver returns SERVFAIL rather than an address it cannot verify. A real signature can only be made with the zone’s private key, so whoever changed the record cannot make a new one.`,
        `Bogus です。手順 1〜${stopped.id - 1} は合格しますが、手順 ${stopped.id} が不合格です。届いたレコードを ${stopped.zone} の鍵で確かめると ${stopped.computed} になり、RRSIG の値 ${stopped.expected} と合いません。リゾルバは確かめられないアドレスを返す代わりに SERVFAIL を返します。本物の署名はゾーンの秘密鍵がなければ作れないので、書き換えた側が新しい署名を作ることはできません。`,
      );
    return t(
      `Bogus. The signature still matches the record, but step ${stopped.id} fails on time: it was valid for days ${stopped.window!.inception}–${stopped.window!.expiration} and the clock says day ${DEFAULT_NOW_DAY}. An old signature could be replayed with old data forever, so it has an expiry, and a zone must re-sign before it. The client gets SERVFAIL.`,
      `Bogus です。署名はレコードと一致していますが、手順 ${stopped.id} が時刻で不合格になります。有効期間は ${stopped.window!.inception}〜${stopped.window!.expiration} 日目で、時計は ${DEFAULT_NOW_DAY} 日目です。古い署名を古いデータといっしょにいつまでも使い回せないよう署名には期限があり、ゾーンはそれまでに署名し直す必要があります。クライアントには SERVFAIL が返ります。`,
    );
  };

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('The chain of trust', '信頼の連鎖')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A validating resolver looks up ${QUERY_NAME}. Each zone — the root, example. and shop.example. — has a key (DNSKEY) and signs its records with it (RRSIG). A parent also publishes a DS record for each signed child: a digest of the child’s key. The resolver trusts one thing in advance, the root’s key (the trust anchor), and checks each link from there down to the answer. It then gives its verdict: Secure, Insecure or Bogus.`,
            `検証するリゾルバが ${QUERY_NAME} を引きます。ルート、example.、shop.example. の各ゾーンは鍵（DNSKEY）を持ち、それで自分のレコードに署名します（RRSIG）。親ゾーンは署名している子ゾーンごとに DS レコードを公開します。これは子の鍵のダイジェストです。リゾルバが最初から信じているのはルートの鍵（トラストアンカー）だけで、そこから答えまでのつながりを 1 つずつ確かめ、Secure・Insecure・Bogus のどれかと判定します。`,
          )}
        </p>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 13,
            color: 'var(--netlab-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {t(
            'Simplified: one key per zone (real zones usually have a KSK and a ZSK, and also sign their own DNSKEY set); signatures and digests are a stand-in 32-bit FNV-1a hash of the key and the data, not real cryptography; time is counted in whole days.',
            '簡単にしている点：鍵はゾーンごとに 1 つです（実際のゾーンは KSK と ZSK に分け、DNSKEY の集合自体にも署名します）。署名とダイジェストは鍵とデータの 32 ビット FNV-1a ハッシュで代用しており、本物の暗号ではありません。時刻は日単位です。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="dnssec-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <div
          role="tablist"
          aria-label={t('Scenario', 'シナリオ')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
        >
          {SCENARIOS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={scenario === id}
              data-testid={`dnssec-scenario-${id}`}
              onClick={() => setScenario(id)}
              style={{ ...lessonChoice(scenario === id), minHeight: 44 }}
            >
              {scenario === id ? '✓ ' : ''}
              {scenarioName(id)}
            </button>
          ))}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }} data-testid="dnssec-story">
          {scenarioStory(scenario)}
        </p>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t('What is the validator’s verdict?', 'リゾルバの判定はどれ？')}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {VERDICTS.map((verdict) => (
            <button
              key={verdict}
              type="button"
              role="radio"
              aria-checked={guess === verdict}
              data-testid={`dnssec-guess-${verdict}`}
              disabled={shown}
              onClick={() => setGuesses({ ...guesses, [scenario]: verdict })}
              style={{ ...lessonChoice(guess === verdict), textAlign: 'left', minHeight: 44 }}
            >
              {guess === verdict ? '✓ ' : ''}
              {verdictName(verdict)}
            </button>
          ))}
        </div>
        {shown ? (
          <p
            data-testid="dnssec-reveal"
            data-right={String(guess === validation.verdict)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === validation.verdict
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {explain(validation)}
          </p>
        ) : (
          <button
            type="button"
            data-testid="dnssec-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, minHeight: 44, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed({ ...revealed, [scenario]: true })}
          >
            {guess
              ? t('Validate the answer', '検証してみる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {shown ? (
        <div style={LESSON_CARD} data-testid="dnssec-chain">
          <div style={LESSON_LABEL}>
            {t('Each check, from the root down', 'ルートから順に確認')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>#</th>
                  <th style={cell}>{t('Check', '確認すること')}</th>
                  <th style={cell}>{t('Result', '結果')}</th>
                  <th style={cell}>{t('Computed vs received', '計算した値と届いた値')}</th>
                </tr>
              </thead>
              <tbody>
                {validation.steps.map((step) => (
                  <tr
                    key={step.id}
                    data-testid={`dnssec-step-${step.id}`}
                    data-result={step.result}
                    data-failure={step.failure ?? ''}
                  >
                    <td style={mono}>{step.id}</td>
                    <td style={cell}>{stepName(step)}</td>
                    <td style={{ ...mono, fontWeight: 700 }}>{resultName(step)}</td>
                    <td style={mono}>{detail(step)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            data-testid="dnssec-verdict"
            data-verdict={validation.verdict}
            data-rcode={validation.rcode}
            data-ad={String(validation.ad)}
            data-address={validation.address ?? ''}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `${verdictWord(validation.verdict)} → the client gets ${validation.rcode}${validation.address ? `, ${validation.address}` : ''}, AD flag ${validation.ad ? 'set' : 'not set'}.`,
              `${verdictWord(validation.verdict)} → クライアントには ${validation.rcode}${validation.address ? `、${validation.address}` : ''}、AD フラグ${validation.ad ? 'あり' : 'なし'}。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed.expired && scenario === 'expired' ? (
        <div style={LESSON_CARD} data-testid="dnssec-clock-card">
          <div style={LESSON_LABEL}>
            {t('Move the validator’s clock', '検証する側の時計を動かす')}
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Day', '日目')}
            <input
              type="range"
              min={0}
              max={MAX_DAY}
              value={nowDay}
              data-testid="dnssec-clock"
              onChange={(event) => setNowDay(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{nowDay}</span>
          </label>
          <p
            data-testid="dnssec-clock-verdict"
            data-verdict={clock.verdict}
            data-stopped={clock.stoppedAt ?? ''}
            data-failure={clock.stoppedAt ? (clock.steps[clock.stoppedAt - 1]!.failure ?? '') : ''}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {clock.stoppedAt
              ? t(
                  `Day ${nowDay}: ${verdictWord(clock.verdict)}, step ${clock.stoppedAt} ${resultName(clock.steps[clock.stoppedAt - 1]!)}.`,
                  `${nowDay} 日目：${verdictWord(clock.verdict)}（手順 ${clock.stoppedAt}：${resultName(clock.steps[clock.stoppedAt - 1]!)}）。`,
                )
              : t(
                  `Day ${nowDay}: ${verdictWord(clock.verdict)}.`,
                  `${nowDay} 日目：${verdictWord(clock.verdict)}。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Because validity depends on the clock, a validating resolver needs correct time: one whose clock is far off rejects good answers. The other signatures in this lesson start on day 1, so on day 0 the first signature checked is not yet valid.',
              '有効かどうかは時計しだいなので、検証するリゾルバには正しい時刻が必要です。時計が大きくずれていると、正しい答えまで拒否してしまいます。このレッスンのほかの署名は 1 日目からなので、0 日目には最初に確かめる署名がまだ有効になっていません。',
            )}
          </p>
        </div>
      ) : null}

      {Object.values(revealed).some(Boolean) ? (
        <div style={LESSON_CARD} data-testid="dnssec-notes">
          <div style={LESSON_LABEL}>{t('What DNSSEC does not do', 'DNSSEC がしないこと')}</div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            {t(
              'DNSSEC proves that an answer is the zone’s own and unchanged; it does not hide it. Anyone on the path can still read the question and the answer. Keeping them private is the job of encrypted DNS (DNS over TLS or over HTTPS), and the two work together. To prove that a name or a record — such as a DS — does not exist, a zone returns signed NSEC or NSEC3 records.',
              'DNSSEC が証明するのは、答えがそのゾーン自身のもので書き換えられていないことです。答えを隠すわけではなく、経路上のだれでも質問と答えを読めます。それを秘密にするのは暗号化 DNS（DNS over TLS や DNS over HTTPS）の役目で、両者は組み合わせて使います。名前やレコード（DS など）が存在しないことを示すには、ゾーンは署名付きの NSEC または NSEC3 レコードを返します。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function DnssecDemo() {
  return (
    <DemoShell
      title="DNSSEC validation"
      desc="Follow the chain of trust from the root to an answer, and predict the validator's verdict"
    >
      <DnssecLesson />
    </DemoShell>
  );
}

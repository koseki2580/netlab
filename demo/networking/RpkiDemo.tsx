import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  ANNOUNCEMENTS,
  ASKED_ID,
  COMPETING,
  ROAS,
  forward,
  parsePrefix,
  validate,
  type Policy,
  type Reason,
  type ValidationState,
} from './rpki';

/** Display order: deliberate, so the right answers do not sit in one position across lessons. */
const STATES: readonly ValidationState[] = ['Valid', 'NotFound', 'Invalid'];
const POLICIES: readonly Policy[] = ['accept-all', 'drop-invalid'];
const DESTINATIONS = ['192.0.2.10', '192.0.2.200'] as const;
/** More-specifics of the /22 ROA, announced by its own origin, for the maxLength slider. */
const LENGTH_PROBES = ['198.51.100.0/23', '198.51.100.0/24', '198.51.100.0/25', '198.51.100.0/26'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const parsePrefixLength = (prefix: string) => parsePrefix(prefix).length;

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function RpkiLesson() {
  const t = useT();
  const [guess, setGuess] = useState<ValidationState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [policy, setPolicy] = useState<Policy>('accept-all');
  const [destination, setDestination] = useState<(typeof DESTINATIONS)[number]>(DESTINATIONS[0]);
  const [maxLength, setMaxLength] = useState(ROAS[1]!.maxLength);
  const asked = ANNOUNCEMENTS.find((a) => a.id === ASKED_ID)!;
  const askedResult = validate(asked, ROAS);
  const truth = askedResult.state;
  const coveringRoa = askedResult.covering[0]!;
  const open = forward(COMPETING, ROAS, destination, 'accept-all');
  const shown = forward(COMPETING, ROAS, destination, policy);
  const looseRoas = [ROAS[0]!, { ...ROAS[1]!, maxLength }];

  const stateName = (state: ValidationState) =>
    ({
      Valid: t('Valid', 'Valid（正当）'),
      Invalid: t('Invalid', 'Invalid（不正）'),
      NotFound: t('NotFound', 'NotFound（該当なし）'),
    })[state];
  const reasonName = (reason: Reason) =>
    ({
      match: t('a ROA matches origin and length', 'オリジンも長さも合う ROA がある'),
      'wrong-origin': t(
        'covered, but by a ROA for another AS',
        'ROA にカバーされているが、別の AS 向け',
      ),
      'too-long': t('right origin, longer than maxLength', 'オリジンは正しいが maxLength より長い'),
      'no-roa': t('no ROA covers it', 'カバーする ROA がない'),
    })[reason];
  const policyName = (p: Policy) =>
    ({
      'accept-all': t('No ROV: accept everything', 'ROV なし：すべて受け入れる'),
      'drop-invalid': t('ROV: drop Invalid', 'ROV あり：Invalid を捨てる'),
    })[p];

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
        <div style={LESSON_LABEL}>
          {t('Who may announce a prefix?', '誰がその経路を広告してよいか')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'BGP itself believes any AS that announces a prefix. RPKI lets the holder of an address block publish a signed ROA (Route Origin Authorization): “this prefix, up to this length (maxLength), may be originated by this AS”. A router doing route origin validation (ROV) checks each announcement against the ROAs and gives it one of three states: Valid, Invalid or NotFound.',
            'BGP そのものは、経路を広告してきた AS を何でも信じます。RPKI では、アドレスの持ち主が署名付きの ROA（Route Origin Authorization）を公開できます。「このプレフィックスは、この長さ（maxLength）まで、この AS が送り出してよい」という宣言です。経路オリジン検証（ROV）を行うルータは、広告を 1 つずつ ROA と照らし合わせ、Valid・Invalid・NotFound の 3 つの状態のどれかを付けます。',
          )}
        </p>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse' }} data-testid="rpki-roas">
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('ROA prefix', 'ROA のプレフィックス')}</th>
                <th style={cell}>maxLength</th>
                <th style={cell}>{t('Origin AS', 'オリジン AS')}</th>
              </tr>
            </thead>
            <tbody>
              {ROAS.map((roa) => (
                <tr key={roa.prefix}>
                  <td style={mono}>{roa.prefix}</td>
                  <td style={mono}>{`/${roa.maxLength}`}</td>
                  <td style={mono}>{`AS${roa.originAs}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={LESSON_CARD} data-testid="rpki-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A router hears AS${asked.originAs} announce ${asked.prefix}. Which state does route origin validation give it?`,
            `ルータに、AS${asked.originAs} から ${asked.prefix} の広告が届きました。経路オリジン検証の結果はどれ？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {STATES.map((state) => (
            <button
              key={state}
              type="button"
              role="radio"
              aria-checked={guess === state}
              data-testid={`rpki-guess-${state.toLowerCase()}`}
              disabled={revealed}
              onClick={() => setGuess(state)}
              style={{ ...lessonChoice(guess === state), textAlign: 'left' }}
            >
              {guess === state ? '✓ ' : ''}
              {stateName(state)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="rpki-reveal"
            data-right={String(guess === truth)}
            data-state={truth}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${truth}. No ROA names ${asked.prefix} itself, but the ROA for ${coveringRoa.prefix} covers it: a /${parsePrefixLength(asked.prefix)} inside a /${parsePrefixLength(coveringRoa.prefix)}. Once a prefix is covered, an announcement must match one covering ROA in both origin and length. Here the ROA allows only AS${coveringRoa.originAs}, and only up to /${coveringRoa.maxLength}; AS${asked.originAs} with a /${parsePrefixLength(asked.prefix)} fails both. NotFound is only for prefixes that no ROA covers at all (RFC 6811).`,
              `${truth} です。${asked.prefix} そのものを書いた ROA はありませんが、${coveringRoa.prefix} の ROA がこれをカバーしています（/${parsePrefixLength(coveringRoa.prefix)} の中の /${parsePrefixLength(asked.prefix)}）。カバーされた広告は、カバーする ROA のどれか 1 つとオリジンも長さも一致しなければなりません。この ROA が認めるのは AS${coveringRoa.originAs} だけで、長さも /${coveringRoa.maxLength} までです。AS${asked.originAs} の /${parsePrefixLength(asked.prefix)} はどちらも満たしません。NotFound になるのは、どの ROA にもカバーされないプレフィックスだけです（RFC 6811）。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="rpki-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Validate the announcement', '広告を検証する')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="rpki-table">
          <div style={LESSON_LABEL}>{t('Every announcement', 'すべての広告')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Announced prefix', '広告されたプレフィックス')}</th>
                  <th style={cell}>{t('Origin', 'オリジン')}</th>
                  <th style={cell}>{t('State', '状態')}</th>
                  <th style={cell}>{t('Why', '理由')}</th>
                </tr>
              </thead>
              <tbody>
                {ANNOUNCEMENTS.map((a) => {
                  const result = validate(a, ROAS);
                  return (
                    <tr key={a.id} data-testid={`rpki-row-${a.id}`} data-state={result.state}>
                      <td style={mono}>{a.prefix}</td>
                      <td style={mono}>{`AS${a.originAs}`}</td>
                      <td style={{ ...mono, fontWeight: 700 }}>{result.state}</td>
                      <td style={cell}>{reasonName(result.reason)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="rpki-forwarding">
          <div style={LESSON_LABEL}>
            {t('Why the /25 matters: longest prefix match', '/25 が問題になる理由：最長一致')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'The router hears both the holder’s /24 and the other origin’s /25. Forwarding picks the longest prefix that contains the destination, whichever AS sent it.',
              'ルータには持ち主の /24 と、別のオリジンからの /25 の両方が届いています。転送では、宛先を含む最も長いプレフィックスが、どの AS から来たかに関係なく選ばれます。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Import policy', '受け入れポリシー')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {POLICIES.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={policy === p}
                data-testid={`rpki-policy-${p}`}
                onClick={() => setPolicy(p)}
                style={{ ...lessonChoice(policy === p), minHeight: 44 }}
              >
                {policy === p ? '✓ ' : ''}
                {policyName(p)}
              </button>
            ))}
          </div>
          <div
            role="tablist"
            aria-label={t('Destination', '宛先')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}
          >
            {DESTINATIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={destination === d}
                data-testid={`rpki-dest-${d}`}
                onClick={() => setDestination(d)}
                style={{ ...lessonChoice(destination === d), minHeight: 44 }}
              >
                {destination === d ? '✓ ' : ''}
                {t(`to ${d}`, `宛先 ${d}`)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Route', '経路')}</th>
                  <th style={cell}>{t('State', '状態')}</th>
                  <th style={cell}>{t('In the table?', 'テーブルに残る？')}</th>
                </tr>
              </thead>
              <tbody>
                {open.installed.map((route) => {
                  const kept = shown.installed.some((r) => r.id === route.id);
                  return (
                    <tr
                      key={route.id}
                      data-testid={`rpki-route-${route.id}`}
                      data-kept={String(kept)}
                    >
                      <td style={mono}>{`${route.prefix} AS${route.originAs}`}</td>
                      <td style={mono}>{route.state}</td>
                      <td style={mono}>{kept ? t('yes', 'はい') : t('dropped', '捨てる')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p
            data-testid="rpki-chosen"
            data-prefix={shown.chosen?.prefix ?? ''}
            data-origin={shown.chosen?.originAs ?? ''}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {shown.chosen
              ? t(
                  `Packets to ${destination} follow ${shown.chosen.prefix} towards AS${shown.chosen.originAs}.`,
                  `${destination} 宛てのパケットは ${shown.chosen.prefix} に従い、AS${shown.chosen.originAs} へ向かいます。`,
                )
              : t(`No route to ${destination}.`, `${destination} への経路はありません。`)}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Without ROV the /25 is longer, so traffic to the lower half of the block goes to an AS the holder never authorised. Dropping Invalid removes the /25, and the holder’s /24 carries the traffic again. NotFound routes are kept: most of the Internet’s prefixes still had no ROA when ROV was introduced, so dropping them would cut off reachable networks.',
              'ROV がなければ /25 のほうが長いので、ブロックの前半への通信は、持ち主が認めていない AS へ流れてしまいます。Invalid を捨てれば /25 が消え、持ち主の /24 がまた通信を運びます。NotFound の経路は残します。ROV が始まった頃はまだ ROA のないプレフィックスが多く、捨てると届くはずのネットワークにつながらなくなるからです。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="rpki-maxlength">
          <div style={LESSON_LABEL}>{t('Setting maxLength', 'maxLength を決める')}</div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t(`maxLength of the ${ROAS[1]!.prefix} ROA`, `${ROAS[1]!.prefix} の ROA の maxLength`)}
            <input
              type="range"
              min={parsePrefixLength(ROAS[1]!.prefix)}
              max={28}
              value={maxLength}
              data-testid="rpki-maxlength-input"
              onChange={(event) => setMaxLength(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`/${maxLength}`}</span>
          </label>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {LENGTH_PROBES.map((prefix) => {
                  const result = validate(
                    { id: prefix, prefix, originAs: ROAS[1]!.originAs },
                    looseRoas,
                  );
                  return (
                    <tr
                      key={prefix}
                      data-testid={`rpki-probe-${parsePrefixLength(prefix)}`}
                      data-state={result.state}
                    >
                      <td style={mono}>{`${prefix} AS${ROAS[1]!.originAs}`}</td>
                      <td style={{ ...mono, fontWeight: 700 }}>{result.state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'A longer maxLength makes more of your more-specifics Valid, but also ones you never announce. If another network sends such a more-specific while naming your AS as the origin, ROV cannot tell it apart and calls it Valid. RFC 9319 therefore advises avoiding maxLength unless every more-specific it allows is really announced, and listing in ROAs only the prefixes you announce.',
              'maxLength を長くすると、自分の細かいプレフィックスの多くが Valid になりますが、実際には広告していないものまで Valid になります。別のネットワークがそうした細かいプレフィックスを、オリジンにあなたの AS を書いて送ってきても、ROV は区別できず Valid とします。そのため RFC 9319 は、許す範囲の細かいプレフィックスをすべて実際に広告している場合を除いて maxLength を使わず、ROA には実際に広告するプレフィックスだけを載せることを勧めています。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="rpki-limits">
          <div style={LESSON_LABEL}>{t('What ROV does not check', 'ROV が確かめないこと')}</div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            {t(
              'ROV checks only the origin, the last AS of the path, never the ASes in between; ASPA (AS provider authorisation) and BGPsec (RFC 8205) are the efforts that address the rest of the path.',
              'ROV が確かめるのはオリジン、つまり AS パスの最後の AS だけで、その間の AS は確かめません。パスの残りを扱う取り組みとして、ASPA（AS プロバイダ認可）と BGPsec（RFC 8205）があります。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: IPv4 only, and the router is handed the ROAs directly. In practice a separate validator fetches and checks the signed RPKI objects and sends the results to routers over the RPKI-to-Router protocol. AS 0 ROAs and routes with an AS_SET origin are left out.',
              '簡略化しています。IPv4 だけを扱い、ルータには ROA をそのまま渡しています。実際には別の検証サーバ（バリデータ）が署名付きの RPKI オブジェクトを集めて検証し、その結果を RPKI-to-Router プロトコルでルータへ送ります。AS 0 の ROA や、オリジンが AS_SET の経路は扱っていません。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function RpkiDemo() {
  return (
    <DemoShell
      title="RPKI route origin validation"
      desc="How a router checks who may originate a BGP prefix, and what that changes for forwarding"
    >
      <RpkiLesson />
    </DemoShell>
  );
}

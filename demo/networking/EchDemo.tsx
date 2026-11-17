import { useEffect, useState } from 'react';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  PROVIDER_IP,
  PUBLIC_NAME,
  SITE,
  firstFlight,
  hexLines,
  readable,
  type FirstFlight,
} from './ech';

type Mode = 'plain' | 'ech';

const MODES: readonly Mode[] = ['plain', 'ech'];

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function EchLesson() {
  const t = useT();
  const [flights, setFlights] = useState<Record<Mode, FirstFlight> | null>(null);
  const [guesses, setGuesses] = useState<Partial<Record<Mode, boolean>>>({});
  const [revealed, setRevealed] = useState(false);
  const [shown, setShown] = useState<Mode>('plain');
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([firstFlight(false), firstFlight(true)]).then(
      ([plain, ech]) => {
        if (live) setFlights({ plain, ech });
      },
      // No crypto.subtle: the page is not on https or localhost.
      () => {
        if (live) setUnavailable(true);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const modeName = (mode: Mode) =>
    mode === 'plain'
      ? t('TLS 1.3 without ECH', 'ECH なしの TLS 1.3')
      : t('TLS 1.3 with ECH', 'ECH ありの TLS 1.3');
  const sees = (mode: Mode) => (flights ? readable(flights[mode].onTheWire).includes(SITE) : null);
  const ready = guesses.plain !== undefined && guesses.ech !== undefined;

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
        <div style={LESSON_LABEL}>Encrypted Client Hello (ECH)</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `You open https://${SITE}/ on a café’s Wi-Fi. TLS 1.3 encrypts the page and even the server’s certificate. But the very first message, the ClientHello, goes out before there is any key — and it names the site (SNI), so that a server hosting many sites knows which certificate to show.`,
            `カフェの Wi-Fi で https://${SITE}/ を開きます。TLS 1.3 はページの中身も、サーバの証明書さえも暗号化します。ところが最初のメッセージ ClientHello は、まだ鍵が何もないうちに送られます。しかも、多くのサイトを載せたサーバがどの証明書を出せばよいか分かるように、サイトの名前（SNI）が書かれています。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="ech-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        {MODES.map((mode) => (
          <div key={mode} style={{ marginBottom: 8 }}>
            <p style={{ margin: '0 0 4px', lineHeight: 1.7 }}>
              {t(
                `${modeName(mode)}: can someone on the café’s Wi-Fi read “${SITE}” in the first bytes?`,
                `${modeName(mode)}：カフェの Wi-Fi にいる人は、最初のバイト列から「${SITE}」を読める？`,
              )}
            </p>
            <div
              role="radiogroup"
              aria-label={modeName(mode)}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
            >
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={guesses[mode] === value}
                  data-testid={`ech-guess-${mode}-${value ? 'yes' : 'no'}`}
                  disabled={revealed}
                  onClick={() => setGuesses((previous) => ({ ...previous, [mode]: value }))}
                  style={{
                    ...LESSON_BUTTON,
                    outline:
                      guesses[mode] === value ? '2px solid var(--netlab-accent-cyan)' : undefined,
                  }}
                >
                  {value ? t('It can be read', '読める') : t('It cannot', '読めない')}
                </button>
              ))}
            </div>
          </div>
        ))}
        {unavailable ? (
          <p role="alert" data-testid="ech-unavailable" style={{ margin: 0, lineHeight: 1.7 }}>
            {t(
              'This browser does not allow encryption on this page. Open the gallery over https or on localhost to see the bytes.',
              'このブラウザでは、このページで暗号化を使えません。バイト列を見るには、ギャラリーを https か localhost で開いてください。',
            )}
          </p>
        ) : revealed ? (
          <p
            data-testid="ech-reveal"
            data-right={String(MODES.every((mode) => guesses[mode] === sees(mode)))}
            role="status"
            style={{ margin: 0, lineHeight: 1.7 }}
          >
            <strong>
              {MODES.every((mode) => guesses[mode] === sees(mode))
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not quite what you predicted. ', '予想と少しちがいました。')}
            </strong>
            {t(
              `Without ECH the name is there in plain text. With ECH the outer ClientHello names only ${PUBLIC_NAME}, the provider’s public name that every site it hosts shares; the real ClientHello travels sealed with a key the provider published in DNS, and only the provider opens it.`,
              `ECH なしでは、名前がそのまま読めます。ECH ありでは、外側の ClientHello に書かれるのは事業者の公開名 ${PUBLIC_NAME} だけで、これは事業者が載せている全サイトで共通です。本物の ClientHello は、事業者が DNS に公開した鍵で封をして送られ、開けられるのは事業者だけです。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="ech-reveal-button"
            disabled={!ready || !flights}
            style={{ ...LESSON_TEAL_BUTTON, opacity: ready ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {ready
              ? t('Look at the bytes', 'バイト列を見る')
              : t('Predict both first', '先に 2 つとも予想してください')}
          </button>
        )}
      </div>

      {revealed && flights ? (
        <div style={LESSON_CARD} data-testid="ech-wire">
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={shown === mode}
                data-testid={`ech-show-${mode}`}
                onClick={() => setShown(mode)}
                style={{
                  ...LESSON_BUTTON,
                  outline: shown === mode ? '2px solid var(--netlab-accent-cyan)' : undefined,
                }}
              >
                {modeName(mode)}
              </button>
            ))}
          </div>
          <p style={{ margin: '8px 0 4px', fontWeight: 700 }} data-testid="ech-readable">
            {t('The observer can read: ', '見ている人が読めるもの：')}
            {readable(flights[shown].onTheWire).join(', ')}
          </p>
          <pre
            data-testid="ech-hex"
            style={{
              margin: 0,
              padding: 8,
              fontSize: 12,
              overflowX: 'auto',
              background: 'var(--netlab-bg-surface)',
              borderRadius: 6,
            }}
          >
            {hexLines(flights[shown].onTheWire).join('\n')}
          </pre>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {shown === 'ech'
              ? t(
                  `${flights.ech.onTheWire.length} bytes: the outer ClientHello, then ${flights.ech.sealed?.length ?? 0} sealed bytes (AES-128-GCM, the outer hello as associated data, so changing it breaks the seal).`,
                  `${flights.ech.onTheWire.length} バイト：外側の ClientHello と、封をした ${flights.ech.sealed?.length ?? 0} バイト（AES-128-GCM。外側の ClientHello を関連データにしているので、外側を書き換えると封が開かなくなります）。`,
                )
              : t(
                  `${flights.plain.onTheWire.length} bytes, built by the simulator’s ClientHello encoder.`,
                  `${flights.plain.onTheWire.length} バイト。シミュレータの ClientHello エンコーダで作っています。`,
                )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ech-limits">
          <div style={LESSON_LABEL}>{t('What ECH does not hide', 'ECH でも隠れないもの')}</div>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>
              {t(
                `The address ${PROVIDER_IP}. It hides the site only when many sites share the provider’s addresses.`,
                `宛先アドレス ${PROVIDER_IP}。多くのサイトが事業者のアドレスを共有していて初めて、どのサイトかが隠れます。`,
              )}
            </li>
            <li>
              {t(
                'The DNS question for the site, unless DNS is encrypted too (DNS over HTTPS or TLS). The ECH key itself comes from the site’s DNS HTTPS record.',
                'サイト名を引く DNS の問い合わせ。DNS も暗号化（DNS over HTTPS / TLS）しない限り見えます。ECH の鍵自体も、サイトの DNS の HTTPS レコードから取ります。',
              )}
            </li>
            <li>
              {t(
                'When and how much is sent. Encryption hides the words, not the size or the timing.',
                'いつ、どれだけ送ったか。暗号化で隠れるのは中身で、大きさやタイミングではありません。',
              )}
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function EchDemo() {
  return (
    <DemoShell
      title="Encrypted Client Hello (ECH)"
      desc="What someone on the path can read in TLS’s first message, with and without ECH"
    >
      <EchLesson />
    </DemoShell>
  );
}

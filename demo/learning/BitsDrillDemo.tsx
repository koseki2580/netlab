import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  WEIGHTS,
  generateRound,
  isRight,
  toBinary,
  working,
  type BitsKind,
  type BitsQuestion,
} from './bits';

const KIND_WORDS: Record<BitsKind, readonly [string, string]> = {
  'to-binary': ['Decimal to binary', '10 進数を 2 進数に'],
  'to-decimal': ['Binary to decimal', '2 進数を 10 進数に'],
  'mask-octet': ['A /number as a mask', '/数字をマスクに'],
  and: ['Address AND mask', 'アドレス AND マスク'],
};

function Prompt({ question }: { question: BitsQuestion }) {
  const t = useT();
  const code = (text: string) => <code style={{ fontSize: 20 }}>{text}</code>;
  switch (question.kind) {
    case 'to-binary':
      return (
        <p style={{ margin: 0 }}>
          {t('Write in eight bits: ', '8 ビットで書いてください：')}
          {code(String(question.value))}
        </p>
      );
    case 'to-decimal':
      return (
        <p style={{ margin: 0 }}>
          {t('What number is ', 'この 8 ビットは 10 進数でいくつ？ ')}
          {code(toBinary(question.value))}
          {t('?', '')}
        </p>
      );
    case 'mask-octet':
      return (
        <p style={{ margin: 0 }}>
          {t(
            `A mask has ${question.value} one-bit(s) in this octet, from the left (as /${16 + question.value} does in the third). What is the octet?`,
            `マスクのこのオクテットには、左から ${question.value} 個の 1 があります（/${16 + question.value} の 3 番目のオクテットと同じ）。10 進数でいくつ？`,
          )}
        </p>
      );
    case 'and':
      return (
        <p style={{ margin: 0 }}>
          {t('Address octet ', 'アドレスのオクテット ')}
          {code(String(question.value))}
          {t(' AND mask octet ', ' と、マスクのオクテット ')}
          {code(String(question.mask))}
          {t(': what is the network octet?', ' の AND（ネットワーク部分）は？')}
        </p>
      );
  }
}

/** The drill, inside DemoShell so it reads the page's language (L023). */
function BitsDrill() {
  const t = useT();
  const search = useLocation().search;
  const [seed, setSeed] = useState(
    () => Number(new URLSearchParams(search).get('seed')) || Date.now() % 100000,
  );
  const round = useMemo(() => generateRound(seed), [seed]);
  const [index, setIndex] = useState(0);
  const [bits, setBits] = useState<boolean[]>(() => WEIGHTS.map(() => false));
  const [typed, setTyped] = useState('');
  const [verdicts, setVerdicts] = useState<(boolean | null)[]>(() => round.map(() => null));
  const question = round[index];
  const checked = verdicts[index] !== null && verdicts[index] !== undefined;
  const done = index >= round.length;
  const bitValue = bits.reduce((sum, on, bit) => (on ? sum + WEIGHTS[bit]! : sum), 0);

  const reset = () => {
    setBits(WEIGHTS.map(() => false));
    setTyped('');
  };
  const check = () => {
    if (!question) return;
    const answer =
      question.kind === 'to-binary' ? bits.map((on) => (on ? '1' : '0')).join('') : typed;
    setVerdicts((previous) =>
      previous.map((verdict, i) => (i === index ? isRight(question, answer) : verdict)),
    );
  };

  if (done) {
    const byKind = (['to-binary', 'to-decimal', 'mask-octet', 'and'] as const).map((kind) => {
      const of = round
        .map((q, i) => ({ q, ok: verdicts[i] }))
        .filter((entry) => entry.q.kind === kind);
      return { kind, right: of.filter((entry) => entry.ok).length, total: of.length };
    });
    return (
      <div style={LESSON_CARD} data-testid="bits-summary">
        <div style={LESSON_LABEL}>{t('Round done', 'このラウンドの結果')}</div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {`${verdicts.filter(Boolean).length} / ${round.length}`}
        </p>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {byKind.map(({ kind, right, total }) => (
            <li key={kind}>{`${t(...KIND_WORDS[kind])}: ${right} / ${total}`}</li>
          ))}
        </ul>
        <button
          type="button"
          data-testid="bits-again"
          style={LESSON_TEAL_BUTTON}
          onClick={() => {
            setSeed((previous) => (previous * 7919 + 13) % 100000 || 1);
            setIndex(0);
            setVerdicts(generateRound(seed).map(() => null));
            reset();
          }}
        >
          {t('Another round', 'もう 1 ラウンド')}
        </button>
      </div>
    );
  }
  if (!question) return null;

  return (
    <div style={LESSON_CARD} data-testid="bits-question" data-kind={question.kind}>
      <div style={LESSON_LABEL}>
        {`${index + 1} / ${round.length} · ${t(...KIND_WORDS[question.kind])}`}
      </div>
      <Prompt question={question} />
      <div
        role="group"
        aria-label={t('The eight bits', '8 つのビット')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
          gap: 4,
          margin: '12px 0',
        }}
      >
        {WEIGHTS.map((weight, bit) => (
          <button
            key={weight}
            type="button"
            data-testid={`bits-bit-${weight}`}
            aria-pressed={bits[bit]}
            aria-label={t(`bit worth ${weight}`, `重み ${weight} のビット`)}
            disabled={checked}
            onClick={() => setBits((previous) => previous.map((on, i) => (i === bit ? !on : on)))}
            style={{
              minHeight: 48,
              borderRadius: 6,
              border: '1px solid var(--netlab-border)',
              background: bits[bit] ? 'var(--netlab-accent-cyan)' : 'var(--netlab-bg-surface)',
              color: bits[bit] ? '#0b1220' : 'var(--netlab-text-primary)',
              fontFamily: 'monospace',
              fontSize: 18,
              cursor: checked ? 'default' : 'pointer',
            }}
          >
            {bits[bit] ? 1 : 0}
            <div style={{ fontSize: 10 }}>{weight}</div>
          </button>
        ))}
      </div>
      <p
        style={{ margin: '0 0 8px', color: 'var(--netlab-text-secondary)', fontSize: 13 }}
        data-testid="bits-sum"
      >
        {t('These bits add up to ', 'このビットの合計：')}
        {bitValue}
      </p>
      {question.kind === 'to-binary' ? null : (
        <input
          data-testid="bits-answer"
          aria-label={t('Your answer, in decimal', '答え（10 進数）')}
          inputMode="numeric"
          value={typed}
          disabled={checked}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !checked) check();
          }}
          style={{ minHeight: 44, fontSize: 18, fontFamily: 'monospace', width: 120 }}
        />
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {checked ? (
          <button
            type="button"
            data-testid="bits-next"
            style={LESSON_TEAL_BUTTON}
            onClick={() => {
              setIndex((previous) => previous + 1);
              reset();
            }}
          >
            {t('Next', '次へ')}
          </button>
        ) : (
          <button type="button" data-testid="bits-check" style={LESSON_TEAL_BUTTON} onClick={check}>
            {t('Check', 'たしかめる')}
          </button>
        )}
        {checked ? null : (
          <button type="button" style={LESSON_BUTTON} onClick={reset}>
            {t('Clear', '消す')}
          </button>
        )}
      </div>
      {checked ? (
        <p
          data-testid="bits-feedback"
          role="status"
          data-correct={String(verdicts[index])}
          style={{ margin: '10px 0 0' }}
        >
          <strong>
            {verdicts[index] ? t('Right. ', '正解です。') : t('Not quite. ', 'ちがいます。')}
          </strong>
          <code>{working(question)}</code>
        </p>
      ) : null}
    </div>
  );
}

export default function BitsDrillDemo() {
  return (
    <DemoShell
      title="Bits and bytes"
      desc="The eight bits of an octet, from which every address and mask is built"
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: 16,
          display: 'grid',
          gap: 12,
          overflowY: 'auto',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <BitsIntro />
        <BitsDrill />
      </div>
    </DemoShell>
  );
}

function BitsIntro() {
  const t = useT();
  return (
    <div style={LESSON_CARD}>
      <div style={LESSON_LABEL}>{t('Bits and bytes', 'ビットとバイト')}</div>
      <p style={{ margin: 0, lineHeight: 1.7 }}>
        {t(
          'An IPv4 address is four octets of eight bits; each bit is worth 128, 64, 32, 16, 8, 4, 2 or 1. Press the bits to build a number, and read a mask as ones from the left. The questions mix four kinds on purpose.',
          'IPv4 アドレスは、8 ビットのオクテットが 4 つ並んだものです。各ビットの重みは 128・64・32・16・8・4・2・1。ビットを押して数を作り、マスクは「左から並んだ 1」として読みます。問題は 4 種類をわざと混ぜて出します。',
        )}
      </p>
    </div>
  );
}

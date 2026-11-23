import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useGalleryLocale, useT } from '../localeContext';
import { PERIODS, POLICIES, UPLINKS, choose, meets, misses, type Uplink } from './sdwan';

const PERIOD_NAMES: readonly (readonly [string, string])[] = [
  ['09:00', '09:00'],
  ['18:00 — evening rush', '18:00（夕方の混雑）'],
  ['20:00', '20:00'],
  ['23:00', '23:00'],
];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function SdwanLesson() {
  const t = useT();
  const locale = useGalleryLocale();
  const [period, setPeriod] = useState(0);
  const [guess, setGuess] = useState<Uplink['id'] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const voice = POLICIES.find((policy) => policy.id === 'voice')!;
  const voiceInRush = choose(voice, 1);
  const linkName = (id: Uplink['id']) => UPLINKS.find((link) => link.id === id)!.name[locale];

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        gap: 12,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>SD-WAN</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A branch office has three uplinks. SD-WAN measures each one all the time and, for every kind of traffic, sends it over the cheapest link that meets that traffic’s needs — moving it once a link’s measurements, averaged over a short window, stop meeting them.',
            '支店には 3 本の回線があります。SD-WAN は各回線をいつも測り、通信の種類ごとに、その通信の条件を満たす中でいちばん安い回線を選びます。その回線の、短い時間で平均した測定値が条件を満たさなくなれば、別の回線へ移します。',
          )}
        </p>
        <table
          data-testid="sdwan-policies"
          style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
              <th style={cell}>{t('Traffic', '通信')}</th>
              <th style={cell}>{t('Needs at most', '許せる上限')}</th>
            </tr>
          </thead>
          <tbody>
            {POLICIES.map((policy) => (
              <tr key={policy.id}>
                <td style={cell}>{policy.name[locale]}</td>
                <td style={{ ...cell, fontFamily: 'monospace' }}>
                  {`${policy.sla.latencyMs} ms / ${policy.sla.jitterMs} ms / ${policy.sla.lossPct} %`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Latency / jitter / loss. Cost: internet 1, LTE 2, MPLS 3 (lower is cheaper).',
            '遅延／揺らぎ／損失。費用：インターネット 1、LTE 2、MPLS 3（小さいほど安い）。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="sdwan-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'At 18:00 the internet line gets busy: 120 ms, 40 ms of jitter, 3 % loss. Where do voice calls go?',
            '18:00 にインターネット回線が混み、遅延 120 ms、揺らぎ 40 ms、損失 3 % になります。音声通話はどの回線へ移る？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {UPLINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              role="radio"
              aria-checked={guess === link.id}
              data-testid={`sdwan-guess-${link.id}`}
              disabled={revealed}
              onClick={() => setGuess(link.id)}
              style={lessonChoice(guess === link.id)}
            >
              {predictionMark(link.id, guess, voiceInRush, revealed)}
              {link.name[locale]}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="sdwan-reveal"
            data-right={String(guess === voiceInRush)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === voiceInRush
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `Voice goes to ${linkName(voiceInRush)}: it meets voice’s needs and costs less than MPLS. Video meetings, which allow only 0.5 % loss, cannot use LTE’s 1 %, so they go to MPLS — the same rush, two answers.`,
              `音声通話は ${linkName(voiceInRush)}へ移ります。通話の条件を満たし、MPLS より安いからです。損失を 0.5 % までしか許さないビデオ会議は LTE の 1 % を使えないので、MPLS へ移ります。同じ混雑でも、答えは通信ごとにちがいます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="sdwan-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => {
              setRevealed(true);
              setPeriod(1);
            }}
          >
            {guess
              ? t('See what SD-WAN does', 'SD-WAN の判断を見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="sdwan-periods">
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: PERIODS }, (_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={period === index}
                data-testid={`sdwan-period-${index}`}
                onClick={() => setPeriod(index)}
                style={lessonChoice(period === index)}
              >
                {t(...PERIOD_NAMES[index]!)}
              </button>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Link', '回線')}</th>
                <th style={cell}>{t('Measured', '測定値')}</th>
                {POLICIES.map((policy) => (
                  <th key={policy.id} style={cell}>
                    {policy.name[locale]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UPLINKS.map((link) => {
                const sample = link.samples[period]!;
                return (
                  <tr key={link.id}>
                    <td style={cell}>{link.name[locale]}</td>
                    <td
                      style={{ ...cell, fontFamily: 'monospace' }}
                    >{`${sample.latencyMs} / ${sample.jitterMs} / ${sample.lossPct}`}</td>
                    {POLICIES.map((policy) => {
                      const chosen = choose(policy, period) === link.id;
                      const ok = meets(sample, policy);
                      return (
                        <td
                          key={policy.id}
                          data-testid={`sdwan-cell-${link.id}-${policy.id}`}
                          data-chosen={String(chosen)}
                          title={ok ? '' : misses(link, policy, period).join(', ')}
                          style={{
                            ...cell,
                            whiteSpace: 'nowrap',
                            fontWeight: chosen ? 700 : 400,
                            color: ok ? undefined : 'var(--netlab-text-secondary)',
                          }}
                        >
                          {chosen
                            ? t('◉ uses it', '◉ 使う')
                            : ok
                              ? t('meets', '条件内')
                              : t('✕ misses', '✕ 条件外')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Real SD-WAN measures with probes every few seconds; here four moments of a day stand for that. The rule is the same: the cheapest link that meets the traffic’s needs.',
              '実際の SD-WAN は数秒おきに試験パケットで測ります。ここでは 1 日の 4 つの時点で代わりに見せています。決め方は同じで、条件を満たす中でいちばん安い回線です。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SdwanDemo() {
  return (
    <DemoShell
      title="SD-WAN"
      desc="Each kind of traffic on the cheapest link that meets its needs, moved as the links change"
    >
      <SdwanLesson />
    </DemoShell>
  );
}

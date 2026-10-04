import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { CourseCopy, CourseLocale } from './courseSteps';
import type { TravelPhase } from './usePacketTravel';

export const CARD: CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 12,
  padding: 16,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
};

interface PartsCopy {
  readonly arrived: string;
  readonly notArrived: string;
  readonly unexpected: string;
  readonly more: string;
  readonly tableTitle: string;
  readonly tableRange: string;
  readonly tableSendTo: string;
  readonly tableUsed: string;
  readonly direct: (side: string | null) => string;
  readonly travelling: (from: string, to: string) => string;
  readonly reached: (at: string) => string;
  readonly stopped: (at: string) => string;
}

export const PARTS_COPY: Record<CourseLocale, PartsCopy> = {
  en: {
    arrived: 'Arrived',
    notArrived: 'Did not arrive — as expected',
    unexpected: 'This did not go as the step expected.',
    more: 'A little more',
    tableTitle: 'Routing table of the router',
    tableRange: 'Destination range',
    tableSendTo: 'Send it to',
    tableUsed: 'used',
    direct: (side) => (side ? `Direct (${side} side)` : 'Direct'),
    travelling: (from, to) => `Sending from ${from} to ${to}…`,
    reached: (at) => `It arrived at ${at}.`,
    stopped: (at) => `It stopped at ${at}.`,
  },
  ja: {
    arrived: '届きました',
    notArrived: '届きませんでした（想定どおり）',
    unexpected: 'このステップの想定とは違う結果になりました。',
    more: 'もう少し詳しく',
    tableTitle: 'ルータの経路表',
    tableRange: '宛先の範囲',
    tableSendTo: '送り先',
    tableUsed: '使用',
    direct: (side) => (side ? `直結（${side} 側）` : '直結'),
    travelling: (from, to) => `${from} から ${to} へ送っています…`,
    reached: (at) => `${at} に届きました。`,
    stopped: (at) => `${at} で止まりました。`,
  },
};

/**
 * A term is marked where it is first said (`**term**` in the step's copy), so a
 * learner who skims can find the word the sentence is there to teach.
 */
export function Emphasis({ text }: { text: string }): ReactNode {
  return text.split('**').map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} style={{ color: 'var(--netlab-text-primary)', fontWeight: 700 }}>
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** How a result is framed: it went well, it failed as announced, or it surprised the step. */
export type ResultTone = 'success' | 'planned-failure' | 'unexpected';

const TONE_BORDER: Record<ResultTone, string> = {
  success: 'var(--netlab-accent-green)',
  // A failure the step announced is not a success and not an alarm.
  'planned-failure': 'var(--netlab-accent-yellow)',
  unexpected: 'var(--netlab-accent-orange)',
};

/**
 * What a step taught, said the way it is read: one line that is the idea, then
 * the reasons in short sentences, then what can wait behind a closed toggle.
 * Two learners in five skipped a result that opened as nine lines of prose, and
 * the term the step existed for was in line six.
 */
export function StepResult({
  copy,
  locale,
  arrived,
  tone,
  moreOpen,
  onToggleMore,
}: {
  copy: CourseCopy;
  locale: CourseLocale;
  arrived: boolean;
  tone: ResultTone;
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const ui = PARTS_COPY[locale];
  return (
    <div
      data-testid="course-outcome"
      data-arrived={arrived ? 'yes' : 'no'}
      data-tone={tone}
      style={{ ...CARD, borderColor: TONE_BORDER[tone], borderWidth: 2 }}
    >
      <div
        data-testid="course-verdict"
        style={{ fontSize: 12, color: 'var(--netlab-text-secondary)', fontWeight: 700 }}
      >
        {arrived ? ui.arrived : ui.notArrived}
      </div>
      {tone === 'unexpected' ? (
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>{ui.unexpected}</p>
      ) : (
        <>
          <p
            data-testid="course-headline"
            style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}
          >
            {copy.headline}
          </p>
          <div
            data-testid="course-points"
            style={{ color: 'var(--netlab-text-secondary)', fontSize: 14 }}
          >
            {copy.points.map((point) => (
              <p key={point} style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
                <Emphasis text={point} />
              </p>
            ))}
          </div>
          <button
            type="button"
            data-testid="course-more-toggle"
            aria-expanded={moreOpen}
            aria-controls="course-more"
            onClick={onToggleMore}
            style={{
              marginTop: 12,
              padding: '6px 10px',
              minHeight: 32,
              background: 'none',
              border: '1px solid var(--netlab-border)',
              borderRadius: 6,
              color: 'var(--netlab-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            <span aria-hidden="true">{moreOpen ? '▾ ' : '▸ '}</span>
            {ui.more}
          </button>
          {moreOpen ? (
            <div
              id="course-more"
              data-testid="course-more"
              style={{ color: 'var(--netlab-text-secondary)', fontSize: 13 }}
            >
              {copy.more.map((line) => (
                <p key={line} style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
                  <Emphasis text={line} />
                </p>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export interface CourseRouteRow {
  readonly destination: string;
  /** `direct`, or the next router's address. */
  readonly nextHop: string;
  /** The router's own address on that network, when the row is directly connected. */
  readonly side: string | null;
  readonly adminDistance: number;
  readonly used: boolean;
}

const CELL: CSSProperties = { padding: '5px 8px', textAlign: 'left' };

/**
 * The router's table, as the step explains it: a range of destinations, and
 * where a packet for that range is sent. The library's own panel also shows the
 * address family and the administrative distance, which the explanation never
 * uses; they are here once the learner has asked for more.
 */
export function CourseRouteTable({
  rows,
  locale,
  detailed,
}: {
  rows: readonly CourseRouteRow[];
  locale: CourseLocale;
  detailed: boolean;
}) {
  const ui = PARTS_COPY[locale];
  return (
    <table
      data-testid="course-route-table"
      data-detailed={detailed ? 'yes' : 'no'}
      style={{
        ...CARD,
        padding: 0,
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <caption
        style={{
          captionSide: 'top',
          textAlign: 'left',
          padding: '0 0 6px',
          fontFamily: 'monospace',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--netlab-text-primary)',
        }}
      >
        {ui.tableTitle}
      </caption>
      <thead>
        <tr style={{ color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
          {detailed ? (
            <th scope="col" data-testid="course-route-extra" style={CELL}>
              AF
            </th>
          ) : null}
          <th scope="col" style={CELL}>
            {ui.tableRange}
          </th>
          <th scope="col" style={CELL}>
            {ui.tableSendTo}
          </th>
          {detailed ? (
            <th scope="col" data-testid="course-route-extra" style={CELL}>
              AD
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={`${row.destination}>${row.nextHop}`}
            data-testid="course-route-row"
            data-used={row.used ? 'true' : undefined}
            aria-current={row.used ? 'true' : undefined}
            style={{
              background: row.used
                ? 'color-mix(in srgb, var(--netlab-accent-green) 18%, transparent)'
                : undefined,
              outline: row.used ? '2px solid var(--netlab-accent-green)' : undefined,
              outlineOffset: -2,
            }}
          >
            {detailed ? <td style={CELL}>{row.destination.includes(':') ? 'v6' : 'v4'}</td> : null}
            <td style={CELL}>
              {row.destination}
              {row.used ? (
                <span
                  style={{ marginLeft: 6, color: 'var(--netlab-accent-green)', fontWeight: 700 }}
                >
                  ● {ui.tableUsed}
                </span>
              ) : null}
            </td>
            <td style={CELL}>{row.nextHop === 'direct' ? ui.direct(row.side) : row.nextHop}</td>
            {detailed ? <td style={CELL}>{row.adminDistance}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * One line above the network saying what the packet is doing. The dot crosses
 * in a second or two and says nothing by itself; a learner who looked away
 * from it for the result box saw neither.
 */
export function CourseCaption({
  phase,
  delivered,
  from,
  to,
  at,
  locale,
}: {
  phase: TravelPhase;
  delivered: boolean;
  from: string;
  to: string;
  /** Where the packet came to rest. */
  at: string;
  locale: CourseLocale;
}) {
  const ui = PARTS_COPY[locale];
  const text =
    phase === 'idle'
      ? ''
      : phase === 'travelling'
        ? ui.travelling(from, to)
        : delivered
          ? ui.reached(at)
          : ui.stopped(at);
  return (
    <div
      data-testid="course-caption"
      data-phase={phase}
      role="status"
      style={{
        // A strip of its own above the network, kept even while it is empty:
        // laid over the canvas it covered the devices of a diagram that fills
        // its frame, and appearing only when needed it moved the diagram.
        flex: '0 0 auto',
        minHeight: 44,
        padding: '6px 10px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text ? (
        <span
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--netlab-bg-elevated)',
            border: '1px solid var(--netlab-border)',
            color: 'var(--netlab-text-primary)',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}

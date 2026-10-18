import type { CSSProperties, ReactNode } from 'react';
import { useGalleryLocale, useT } from '../../localeContext';
import { CARRIES_LABELS, FIELD_LABELS } from '../../packet-lab/fields';
import { sizeOf } from '../../packet-lab/judge';
import type {
  Candidate,
  FieldId,
  FragmentExercise,
  PacketField,
  PacketGiven,
  ReadQuestion,
} from '../../packet-lab/model';
import { INPUT, MUTED, SECONDARY, SELECT } from '../ui/styles';
import { EMPTY_ROW, type Entered, type FragmentDraft } from './answers';

/** The candidates in the order of this attempt: turned by the attempt's slot, so a place gives nothing away. */
export function inAttemptOrder<T>(items: readonly T[], slot: number): T[] {
  if (items.length === 0) return [];
  const turn = slot % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

const LAYER = (colour: string): CSSProperties => ({
  border: `2px solid ${colour}`,
  borderRadius: 10,
  padding: '8px 10px',
  display: 'grid',
  gap: 6,
});

const EDITABLE: CSSProperties = {
  outline: '2px dashed var(--netlab-accent-cyan)',
  outlineOffset: 2,
  borderRadius: 6,
  padding: 4,
};

function Row({
  label,
  editable,
  children,
}: {
  label: string;
  editable: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        ...(editable ? EDITABLE : {}),
      }}
    >
      <span style={{ minWidth: 150, fontWeight: editable ? 700 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'ui-monospace, monospace', overflowWrap: 'anywhere' }}>
        {children}
      </span>
    </div>
  );
}

const CHIP = (on: boolean): CSSProperties => ({
  ...SECONDARY,
  fontFamily: 'ui-monospace, monospace',
  ...(on ? { background: '#115e59', color: '#ecfeff', borderColor: '#0f766e' } : {}),
});

/** One of a few candidates, pressed. `testId` is followed by `-option-<value>`. */
export function Choices({
  testId,
  label,
  candidates,
  chosen,
  onChoose,
  disabled,
}: {
  testId: string;
  label: string;
  candidates: readonly Candidate[];
  chosen: string | undefined;
  onChoose: (value: string) => void;
  disabled: boolean;
}) {
  const locale = useGalleryLocale();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
    >
      {candidates.map((candidate) => {
        const value = String(candidate.value);
        const on = chosen === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            data-testid={`${testId}-option-${value}`}
            onClick={() => onChoose(value)}
            style={CHIP(on)}
          >
            {candidate.label?.[locale] ?? value}
          </button>
        );
      })}
    </div>
  );
}

/** The box for one editable field of the packet. */
function FieldBox({
  field,
  entered,
  onEnter,
  slot,
  disabled,
  draft,
}: {
  field: PacketField;
  entered: string | boolean | undefined;
  onEnter: (id: FieldId, value: string | boolean) => void;
  slot: number;
  disabled: boolean;
  draft: boolean;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const label = field.label[locale];
  const testId = `packet-field-${field.id}`;
  if (field.candidates) {
    return (
      <Choices
        testId={testId}
        label={label}
        candidates={inAttemptOrder(field.candidates, slot)}
        chosen={entered === undefined ? undefined : String(entered)}
        onChoose={(value) => onEnter(field.id, value)}
        disabled={disabled}
      />
    );
  }
  const input = field.input;
  if (input.kind === 'flag') {
    const on = entered === true;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        data-testid={testId}
        onClick={() => onEnter(field.id, !on)}
        style={CHIP(on)}
      >
        {on
          ? t('Set: do not split', '付いている（分割しない）')
          : t('Clear: may be split', '付いていない（分割してよい）')}
      </button>
    );
  }
  if (input.kind === 'choice') {
    return (
      <select
        aria-label={label}
        data-testid={testId}
        disabled={disabled}
        value={typeof entered === 'string' ? entered : ''}
        onChange={(event) => onEnter(field.id, event.target.value)}
        style={SELECT}
      >
        {input.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label[locale]}
          </option>
        ))}
      </select>
    );
  }
  return (
    <span style={{ display: 'inline-grid', gap: 2 }}>
      <input
        type="text"
        inputMode={input.kind === 'number' ? 'numeric' : 'text'}
        aria-label={label}
        aria-invalid={draft}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        data-testid={testId}
        value={typeof entered === 'string' ? entered : ''}
        onChange={(event) => onEnter(field.id, event.target.value)}
        placeholder={
          input.kind === 'address'
            ? '192.168.1.10'
            : input.kind === 'mac'
              ? '02:00:00:00:00:00'
              : `${input.min}–${input.max}`
        }
        style={{ ...INPUT, width: input.kind === 'number' ? 120 : 220 }}
      />
      {draft ? (
        <span
          data-testid={`${testId}-draft`}
          style={{ fontSize: 13, color: 'var(--netlab-accent-orange)' }}
        >
          {t('Write a whole number.', '整数で書いてください。')}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The packet as nested layers: the frame (only where a MAC matters), the IP
 * packet, and what it carries. The fields the learner may change are boxes,
 * outlined; the rest are values to read.
 */
export function PacketLayers({
  packet,
  fields,
  entered,
  onEnter,
  slot,
  disabled,
  showFrame,
  drafts,
  testId,
  title,
}: {
  packet: PacketGiven;
  fields: readonly PacketField[];
  entered: Entered;
  onEnter: (id: FieldId, value: string | boolean) => void;
  slot: number;
  disabled: boolean;
  showFrame: boolean;
  drafts: readonly FieldId[];
  testId: string;
  title: string;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const editable = new Map(fields.map((field) => [field.id, field]));
  const show = (id: FieldId, given: ReactNode) => {
    const field = editable.get(id);
    return (
      <Row label={FIELD_LABELS[id][locale]} editable={field !== undefined}>
        {field ? (
          <FieldBox
            field={field}
            entered={entered[id]}
            onEnter={onEnter}
            slot={slot}
            disabled={disabled}
            draft={drafts.includes(id)}
          />
        ) : (
          given
        )}
      </Row>
    );
  };
  const blank = <span style={MUTED}>{t('(empty)', '（空）')}</span>;
  const carriesPort = packet.carries !== 'icmp' || editable.has('carries');
  const ip = (
    <div style={LAYER('var(--netlab-accent-cyan)')} data-testid={`${testId}-ip`}>
      <strong>{t('IP packet', 'IP パケット')}</strong>
      <Row label={t('Source address', '送り主アドレス')} editable={false}>
        {packet.srcIp}
      </Row>
      {show('dstIp', packet.dstIp ?? blank)}
      {show('ttl', packet.ttl ?? blank)}
      {show('df', packet.df ? t('set', '付いている') : t('clear', '付いていない'))}
      {show('size', `${sizeOf(packet)}`)}
      <div style={LAYER('var(--netlab-accent-orange)')}>
        <strong>{t('What it carries', '中身')}</strong>
        {show('carries', CARRIES_LABELS[packet.carries][locale])}
        {carriesPort ? show('dstPort', packet.dstPort ?? blank) : null}
      </div>
    </div>
  );
  return (
    <section data-testid={testId} aria-label={title} style={{ display: 'grid', gap: 6 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
      {showFrame ? (
        <div style={LAYER('var(--netlab-text-secondary)')} data-testid={`${testId}-frame`}>
          <strong>{t('Frame', 'フレーム')}</strong>
          <Row label={t('Source MAC address', '送り主 MAC アドレス')} editable={false}>
            {packet.srcMac}
          </Row>
          {show(
            'dstMac',
            packet.dstMac ?? (
              <span style={MUTED}>{t('chosen by the sender', '送り主が決める')}</span>
            ),
          )}
          {ip}
        </div>
      ) : (
        ip
      )}
    </section>
  );
}

const ROW_CSS = `
.packet-fragment-head, .packet-fragment-row { display: grid; grid-template-columns: 3em repeat(var(--packet-cols), minmax(0, 1fr)) 7em; gap: 8px; align-items: center; }
.packet-fragment-row .packet-fragment-label { display: none; }
@media (max-width: 600px) {
  .packet-fragment-head { display: none; }
  .packet-fragment-row { grid-template-columns: 1fr; border: 1px solid var(--netlab-border); border-radius: 10px; padding: 12px; }
  .packet-fragment-row .packet-fragment-label { display: block; font-size: 14px; }
}`;

/**
 * The learner's statement of a split: one row per piece, added and removed by
 * the learner (the number of pieces is part of the answer). Beside the
 * diagram a table; on a phone one card per piece.
 */
export function FragmentTable({
  exercise,
  rows,
  onRows,
  disabled,
  drafts,
}: {
  exercise: FragmentExercise;
  rows: readonly FragmentDraft[];
  onRows: (rows: readonly FragmentDraft[]) => void;
  disabled: boolean;
  drafts: readonly number[];
}) {
  const t = useT();
  const { offsets, flags } = exercise.asks;
  const unit =
    exercise.offsetUnit === 'bytes'
      ? t('in bytes', 'バイト数')
      : t('in steps of 8 bytes', '8 バイト単位');
  const columns = [
    t('Size (bytes, IP header included)', '大きさ（バイト・IP ヘッダ込み）'),
    ...(offsets ? [`${t('Position', '位置')}（${unit}）`] : []),
    ...(flags ? [t('"More pieces follow"', '「続きあり」の印')] : []),
  ];
  const set = (index: number, change: Partial<FragmentDraft>) =>
    onRows(rows.map((row, at) => (at === index ? { ...row, ...change } : row)));
  return (
    <section
      data-testid="fragment-table"
      aria-label={t('The pieces', '断片の一覧')}
      style={
        { display: 'grid', gap: 8, ['--packet-cols' as string]: columns.length } as CSSProperties
      }
    >
      <style>{ROW_CSS}</style>
      <h3 style={{ margin: 0, fontSize: 16 }}>{t('The pieces, in order', '断片（順番どおり）')}</h3>
      {rows.length > 0 ? (
        <div
          className="packet-fragment-head"
          aria-hidden="true"
          style={{ fontSize: 13, fontWeight: 700 }}
        >
          <span>#</span>
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
          <span />
        </div>
      ) : (
        <p data-testid="fragment-empty" style={{ ...MUTED, margin: 0 }}>
          {t(
            'No pieces yet. Add one row per piece.',
            'まだ断片がありません。断片 1 つにつき 1 行ずつ足してください。',
          )}
        </p>
      )}
      {rows.map((row, index) => {
        const n = index + 1;
        const bad = drafts.includes(n);
        return (
          <div
            key={n}
            className="packet-fragment-row"
            data-testid={`fragment-row-${n}`}
            aria-label={t(`Piece ${n}`, `${n} つ目の断片`)}
            role="group"
          >
            <strong>{t(`Piece ${n}`, `${n} つ目`)}</strong>
            <label style={{ display: 'grid', gap: 2 }}>
              <span className="packet-fragment-label">{columns[0]}</span>
              <input
                type="text"
                inputMode="numeric"
                aria-label={`${columns[0]} ${n}`}
                aria-invalid={bad && !/^\d+$/.test(row.size.trim())}
                data-testid={`fragment-size-${n}`}
                disabled={disabled}
                value={row.size}
                onChange={(event) => set(index, { size: event.target.value })}
                style={{ ...INPUT, width: '100%' }}
              />
            </label>
            {offsets ? (
              <label style={{ display: 'grid', gap: 2 }}>
                <span className="packet-fragment-label">{columns[1]}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`${columns[1]} ${n}`}
                  aria-invalid={bad && !/^\d+$/.test(row.offset.trim())}
                  data-testid={`fragment-offset-${n}`}
                  disabled={disabled}
                  value={row.offset}
                  onChange={(event) => set(index, { offset: event.target.value })}
                  style={{ ...INPUT, width: '100%' }}
                />
              </label>
            ) : null}
            {flags ? (
              <span style={{ display: 'grid', gap: 2 }}>
                <span className="packet-fragment-label">{columns[columns.length - 1]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.mf}
                  aria-label={`${columns[columns.length - 1]} ${n}`}
                  data-testid={`fragment-mf-${n}`}
                  disabled={disabled}
                  onClick={() => set(index, { mf: !row.mf })}
                  style={CHIP(row.mf)}
                >
                  {row.mf ? t('More follow', '続きあり') : t('Last piece', '最後')}
                </button>
              </span>
            ) : null}
            <button
              type="button"
              data-testid={`fragment-remove-${n}`}
              disabled={disabled}
              onClick={() => onRows(rows.filter((_, at) => at !== index))}
              style={SECONDARY}
            >
              {t('Remove', '消す')}
            </button>
          </div>
        );
      })}
      <div>
        <button
          type="button"
          data-testid="fragment-add"
          disabled={disabled}
          onClick={() => onRows([...rows, EMPTY_ROW])}
          style={SECONDARY}
        >
          {t('+ Add a piece', '＋ 断片を足す')}
        </button>
      </div>
      {drafts.length > 0 ? (
        <p data-testid="fragment-draft" style={{ margin: 0, color: 'var(--netlab-accent-orange)' }}>
          {t(
            `Write whole numbers in piece ${drafts.join(', ')}.`,
            `${drafts.map((row) => `${row} つ目`).join('・')}の断片に、整数を書いてください。`,
          )}
        </p>
      ) : null}
    </section>
  );
}

/** The questions of a read exercise, each one pick among a few. */
export function Questions({
  questions,
  picks,
  onPick,
  slot,
  disabled,
}: {
  questions: readonly ReadQuestion[];
  picks: Readonly<Record<string, string>>;
  onPick: (questionId: string, value: string) => void;
  slot: number;
  disabled: boolean;
}) {
  const locale = useGalleryLocale();
  return (
    <section data-testid="packet-questions" style={{ display: 'grid', gap: 12 }}>
      {questions.map((question, index) => (
        <div key={question.id} style={{ display: 'grid', gap: 6 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{question.prompt[locale]}</p>
          <Choices
            testId={`packet-pick-${question.id}`}
            label={question.prompt[locale]}
            candidates={inAttemptOrder(question.candidates, slot + index)}
            chosen={picks[question.id]}
            onChoose={(value) => onPick(question.id, value)}
            disabled={disabled}
          />
        </div>
      ))}
    </section>
  );
}

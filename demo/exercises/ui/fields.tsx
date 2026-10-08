import { useState, type CSSProperties, type ReactNode } from 'react';
import { useGalleryLocale, useT } from '../../localeContext';
import type { SettingChange } from '../model/types';
import { isAddress, wholeNumber } from './addresses';
import { INPUT, MUTED, SECONDARY, SELECT } from './styles';
import { ACCESS_PORT_HELP, CABLE_WORDS, PORT_USE_WORDS, TRUNK_PORT_HELP } from './words';

/**
 * One field per kind of setting. Each is given the setting's current value as
 * the `SettingChange` that would write it, and calls `onChange` with a whole
 * new value. Text that is not a usable value yet stays in the field as a
 * draft, with a plain note; the topology keeps the last usable value.
 */

type Change<K extends SettingChange['kind']> = Extract<SettingChange, { readonly kind: K }>;

export interface FieldProps<K extends SettingChange['kind']> {
  readonly value: Change<K>;
  readonly onChange: (change: Change<K>) => void;
  /** The card's test id; inner controls append to it. */
  readonly testId: string;
  /** Levels 1 and 2: plain glosses beside the controls. */
  readonly plain: boolean;
}

const FIELD_LABEL: CSSProperties = { display: 'grid', gap: 4, fontSize: 14 };
const NOTE: CSSProperties = { margin: 0, fontSize: 14, color: 'var(--netlab-text-primary)' };
const ROW: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' };

function Note({ testId, children }: { testId: string; children: ReactNode }) {
  return (
    <p data-testid={`${testId}-note`} style={NOTE}>
      <span aria-hidden="true">✎ </span>
      {children}
    </p>
  );
}

/** A text field that only reports text `parse` accepts; anything else stays a draft. */
function DraftInput<T>({
  label,
  shown,
  parse,
  onValid,
  note,
  testId,
  inputMode,
  width = 190,
}: {
  label: string;
  /** The current value as text. */
  shown: string;
  parse: (text: string) => T | null;
  onValid: (value: T) => void;
  /** Said under the field while the draft is not usable. */
  note: string;
  testId: string;
  inputMode: 'decimal' | 'numeric' | 'text';
  width?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <label style={FIELD_LABEL}>
        <span>{label}</span>
        <input
          data-testid={`${testId}-input`}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={draft ?? shown}
          aria-invalid={draft !== null}
          onChange={(event) => {
            const text = event.target.value.trim();
            const parsed = parse(text);
            if (parsed === null) {
              setDraft(text);
              return;
            }
            setDraft(null);
            onValid(parsed);
          }}
          style={{ ...INPUT, width }}
        />
      </label>
      {draft !== null ? <Note testId={testId}>{note}</Note> : null}
    </div>
  );
}

interface ToggleWords {
  readonly symbol: string;
  readonly state: { readonly en: string; readonly ja: string };
  readonly action: { readonly en: string; readonly ja: string };
}

/**
 * A switch that says how things are now and, apart from that, what a press
 * will do: 「✕ ぬけています → 押すと、つなぎます」. One phrase for both read as
 * a statement, and a learner did not take it for a button.
 */
function Toggle({
  on,
  onWords,
  offWords,
  label,
  onToggle,
  testId,
}: {
  on: boolean;
  onWords: ToggleWords;
  offWords: ToggleWords;
  label: string;
  onToggle: (next: boolean) => void;
  testId: string;
}) {
  const locale = useGalleryLocale();
  const words = on ? onWords : offWords;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: ${words.state[locale]} → ${words.action[locale]}`}
      data-testid={`${testId}-toggle`}
      data-state={on ? 'on' : 'off'}
      onClick={() => onToggle(!on)}
      style={{
        ...SECONDARY,
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        textAlign: 'left',
        fontSize: 16,
        borderWidth: 2,
        borderColor: on ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-orange)',
      }}
    >
      <span>
        <span aria-hidden="true">{words.symbol} </span>
        <strong data-testid={`${testId}-state`}>{words.state[locale]}</strong>
      </span>{' '}
      <span data-testid={`${testId}-action`} style={{ fontWeight: 400 }}>
        <span aria-hidden="true">→ </span>
        {words.action[locale]}
      </span>
    </button>
  );
}

// --- host-ip -----------------------------------------------------------------

export function HostIpField({
  value,
  onChange,
  testId,
  candidates,
}: FieldProps<'host-ip'> & { readonly candidates: readonly string[] }) {
  const t = useT();
  // Remounting the input drops a half-typed draft when a chip is chosen.
  const [chipPresses, setChipPresses] = useState(0);
  const current = value.ip ?? t('none', 'なし');
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p data-testid={`${testId}-current`} style={{ margin: 0 }}>
        {t('Address now: ', 'いまのアドレス：')}
        <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{current}</strong>
      </p>
      {candidates.length > 0 ? (
        <div
          role="group"
          aria-label={t('Addresses to choose from', 'えらべるアドレス')}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          {candidates.map((candidate, index) => (
            <button
              key={candidate}
              type="button"
              data-testid={`exercise-chip-${index}`}
              aria-pressed={value.ip === candidate}
              onClick={() => {
                setChipPresses((count) => count + 1);
                onChange({ ...value, ip: candidate });
              }}
              style={{
                ...SECONDARY,
                fontFamily: 'ui-monospace, monospace',
                fontSize: 16,
                borderWidth: 2,
                borderColor:
                  value.ip === candidate ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)',
              }}
            >
              {value.ip === candidate ? <span aria-hidden="true">✓&nbsp;</span> : null}
              {candidate}
            </button>
          ))}
        </div>
      ) : null}
      <DraftInput
        key={chipPresses}
        label={
          candidates.length > 0
            ? t('Or type an address', 'または、自分で入力する')
            : t('New address', '新しいアドレス')
        }
        shown={value.ip ?? ''}
        parse={(text) => (text === '' ? { ip: null } : isAddress(text) ? { ip: text } : null)}
        onValid={({ ip }) => onChange({ ...value, ip })}
        note={t(
          `That is not a whole address yet. An address is four numbers with dots, like 192.168.1.20. Until it is, the address stays ${current}.`,
          `まだアドレスの形になっていません。アドレスは「192.168.1.20」のように、点で区切った 4 つの数です。直すまでは ${current} のままです。`,
        )}
        testId={testId}
        inputMode="decimal"
      />
    </div>
  );
}

// --- iface-address -----------------------------------------------------------

const PREFIX_LENGTHS = [8, 16, 24, 25, 26, 27, 28, 30];

function prefixGloss(length: number, t: (en: string, ja: string) => string): string {
  if (length === 8)
    return t('/8 (the first number is the network)', '/8（最初の 1 つの数がネットワーク）');
  if (length === 16) {
    return t('/16 (the first two numbers are the network)', '/16（最初の 2 つの数がネットワーク）');
  }
  if (length === 24) {
    return t(
      '/24 (the first three numbers are the network)',
      '/24（最初の 3 つの数がネットワーク）',
    );
  }
  const hosts = 2 ** (32 - length) - 2;
  return t(
    `/${length} (a small network: ${hosts} devices)`,
    `/${length}（小さなネットワーク：${hosts} 台まで）`,
  );
}

export function IfaceAddressField({ value, onChange, testId, plain }: FieldProps<'iface-address'>) {
  const t = useT();
  const lengths = PREFIX_LENGTHS.includes(value.prefixLength)
    ? PREFIX_LENGTHS
    : [...PREFIX_LENGTHS, value.prefixLength].sort((a, b) => a - b);
  return (
    <div style={ROW}>
      <DraftInput
        label={t('Address', 'アドレス')}
        shown={value.ipAddress}
        parse={(text) => (isAddress(text) ? text : null)}
        onValid={(ipAddress) => onChange({ ...value, ipAddress })}
        note={t(
          `That is not a whole address yet (four numbers with dots). Until it is, the address stays ${value.ipAddress}.`,
          `まだアドレスの形になっていません（点で区切った 4 つの数）。直すまでは ${value.ipAddress} のままです。`,
        )}
        testId={testId}
        inputMode="decimal"
      />
      <label style={FIELD_LABEL}>
        <span>{t('Size of the network', 'ネットワークの大きさ')}</span>
        <select
          data-testid={`${testId}-prefix`}
          value={value.prefixLength}
          onChange={(event) => onChange({ ...value, prefixLength: Number(event.target.value) })}
          style={SELECT}
        >
          {lengths.map((length) => (
            <option key={length} value={length}>
              {plain ? prefixGloss(length, t) : `/${length}`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// --- link-state, stp-port ----------------------------------------------------

export function LinkStateField({ value, onChange, testId }: FieldProps<'link-state'>) {
  const t = useT();
  return (
    <Toggle
      on={value.state === 'up'}
      onWords={CABLE_WORDS.up}
      offWords={CABLE_WORDS.down}
      label={t('Cable', '線')}
      onToggle={(up) => onChange({ ...value, state: up ? 'up' : 'down' })}
      testId={testId}
    />
  );
}

export function StpPortField({ value, onChange, testId }: FieldProps<'stp-port'>) {
  const t = useT();
  return (
    <Toggle
      on={value.enabled}
      onWords={PORT_USE_WORDS.on}
      offWords={PORT_USE_WORDS.off}
      label={t('This port', 'この差し込み口')}
      onToggle={(enabled) => onChange({ ...value, enabled })}
      testId={testId}
    />
  );
}

// --- port-vlan ---------------------------------------------------------------

function parseVlanList(text: string): number[] | null {
  const parts = text.split(/[\s,、]+/).filter((part) => part !== '');
  const numbers = parts.map((part) => wholeNumber(part, 1, 4094));
  return numbers.every((entry): entry is number => entry !== null) ? numbers : null;
}

export function PortVlanField({ value, onChange, testId, plain }: FieldProps<'port-vlan'>) {
  const t = useT();
  const { kind, nodeId, portId } = value;
  const base = { kind, nodeId, portId };
  const allowed = value.trunkAllowedVlans ?? [];
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={ROW}>
        <label style={FIELD_LABEL}>
          <span>{t('Kind of port', '差し込み口の種類')}</span>
          <select
            data-testid={`${testId}-mode`}
            value={value.vlanMode}
            onChange={(event) =>
              onChange(
                event.target.value === 'trunk'
                  ? { ...base, vlanMode: 'trunk', trunkAllowedVlans: [value.accessVlan ?? 1] }
                  : { ...base, vlanMode: 'access', accessVlan: allowed[0] ?? 1 },
              )
            }
            style={SELECT}
          >
            <option value="access">
              {plain ? t('For one group (access)', '1 つのグループ専用（アクセス）') : 'access'}
            </option>
            <option value="trunk">
              {plain
                ? t('Carries several groups (trunk)', '複数のグループを通す（トランク）')
                : 'trunk'}
            </option>
          </select>
        </label>
        {value.vlanMode === 'access' ? (
          <DraftInput
            key="access"
            label={t('Group number (VLAN)', 'グループの番号（VLAN）')}
            shown={String(value.accessVlan ?? 1)}
            parse={(text) => wholeNumber(text, 1, 4094)}
            onValid={(accessVlan) => onChange({ ...base, vlanMode: 'access', accessVlan })}
            note={t(
              `A VLAN number is a whole number from 1 to 4094. Until it is, the number stays ${value.accessVlan ?? 1}.`,
              `VLAN の番号は 1 から 4094 までの数です。直すまでは ${value.accessVlan ?? 1} のままです。`,
            )}
            testId={`${testId}-vlan`}
            inputMode="numeric"
            width={110}
          />
        ) : (
          <DraftInput
            key="trunk"
            label={t(
              'Groups it carries (VLAN numbers, with commas)',
              '通すグループ（VLAN の番号。カンマで区切る）',
            )}
            shown={allowed.join(', ')}
            parse={parseVlanList}
            onValid={(trunkAllowedVlans) =>
              onChange({ ...base, vlanMode: 'trunk', trunkAllowedVlans })
            }
            note={t(
              'Write VLAN numbers from 1 to 4094 with commas between them, like 10, 20.',
              'VLAN の番号（1 から 4094）を、「10, 20」のようにカンマで区切って書いてください。',
            )}
            testId={`${testId}-allowed`}
            inputMode="text"
          />
        )}
      </div>
      {plain ? (
        <p
          data-testid={`${testId}-help`}
          data-mode={value.vlanMode}
          style={{ ...MUTED, margin: 0, fontSize: 14 }}
        >
          {value.vlanMode === 'trunk'
            ? t(TRUNK_PORT_HELP.en, TRUNK_PORT_HELP.ja)
            : t(ACCESS_PORT_HELP.en, ACCESS_PORT_HELP.ja)}
        </p>
      ) : null}
    </div>
  );
}

// --- stp-priority, ospf-cost, iface-nat --------------------------------------

const STP_PRIORITIES = Array.from({ length: 16 }, (_, index) => index * 4096);

export function StpPriorityField({ value, onChange, testId }: FieldProps<'stp-priority'>) {
  const t = useT();
  const priorities = STP_PRIORITIES.includes(value.priority)
    ? STP_PRIORITIES
    : [...STP_PRIORITIES, value.priority].sort((a, b) => a - b);
  return (
    <label style={FIELD_LABEL}>
      <span>
        {t(
          'Priority (the smaller, the more likely to be the root)',
          '優先度（小さいほどルートになりやすい）',
        )}
      </span>
      <select
        data-testid={`${testId}-select`}
        value={value.priority}
        onChange={(event) => onChange({ ...value, priority: Number(event.target.value) })}
        style={{ ...SELECT, width: 160 }}
      >
        {priorities.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OspfCostField({ value, onChange, testId, plain }: FieldProps<'ospf-cost'>) {
  const t = useT();
  return (
    <DraftInput
      label={
        plain
          ? t(
              'Cost (the route with the smallest total is used)',
              'コスト（合計が小さい道が選ばれる）',
            )
          : t('Cost', 'コスト')
      }
      shown={String(value.cost)}
      parse={(text) => wholeNumber(text, 1, 65535)}
      onValid={(cost) => onChange({ ...value, cost })}
      note={t(
        `A cost is a whole number from 1 to 65535. Until it is, the cost stays ${value.cost}.`,
        `コストは 1 から 65535 までの数です。直すまでは ${value.cost} のままです。`,
      )}
      testId={testId}
      inputMode="numeric"
      width={110}
    />
  );
}

export function IfaceNatField({ value, onChange, testId }: FieldProps<'iface-nat'>) {
  const t = useT();
  return (
    <label style={FIELD_LABEL}>
      <span>{t('Which side this is', 'こちらはどちら側か')}</span>
      <select
        data-testid={`${testId}-select`}
        value={value.nat ?? 'none'}
        onChange={(event) => {
          const next = event.target.value;
          onChange({ ...value, nat: next === 'inside' || next === 'outside' ? next : null });
        }}
        style={SELECT}
      >
        <option value="none">{t('Neither', 'どちらでもない')}</option>
        <option value="inside">
          {t('Inside (your own network)', '内側（自分たちのネットワーク）')}
        </option>
        <option value="outside">
          {t('Outside (the internet side)', '外側（インターネット側）')}
        </option>
      </select>
    </label>
  );
}

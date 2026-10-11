import { useState, type CSSProperties } from 'react';
import type { AclRule } from '../../../src/types/acl';
import type { StaticRouteConfig } from '../../../src/types/routing';
import { useT } from '../../localeContext';
import { isAddress, isNetwork, wholeNumber } from './addresses';
import type { FieldProps } from './fields';
import { INPUT, MUTED, SECONDARY, SELECT } from './styles';

/**
 * The two settings that are lists: a router's hand-written routes and an
 * interface's ACL. The rows are kept here as typed; only the rows that are
 * usable as they stand are written into the topology, and the editor says how
 * many are not counted yet.
 */

/**
 * How many rows the form takes. This is a limit of the form, not of an
 * exercise: no exercise needs this many, and the grader accepts any correct
 * configuration however many rows it has, so `SettingRef` carries no `max`.
 * A full list says so (`-full`), because a button that just stops working
 * tells the learner nothing.
 */
export const MAX_ROUTES = 6;
export const MAX_ACL_RULES = 8;

const SMALL: CSSProperties = { ...SECONDARY, padding: '8px 10px', minWidth: 44 };
const CELL: CSSProperties = { display: 'grid', gap: 2, fontSize: 13 };
const ROW_BOX: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'end',
  padding: 8,
  border: '1px solid var(--netlab-border)',
  borderRadius: 8,
};

// --- static-routes -----------------------------------------------------------

interface RouteRow {
  readonly destination: string;
  readonly nextHop: string;
  readonly metric?: number;
}

const routeUsable = (row: RouteRow) =>
  isNetwork(row.destination) && (isAddress(row.nextHop) || row.nextHop === 'direct');

export function StaticRoutesField({ value, onChange, testId, plain }: FieldProps<'static-routes'>) {
  const t = useT();
  const [rows, setRows] = useState<readonly RouteRow[]>(value.routes);
  const waiting = rows.filter((row) => !routeUsable(row)).length;

  const update = (next: readonly RouteRow[]) => {
    setRows(next);
    const routes: StaticRouteConfig[] = next.filter(routeUsable).map((row) => ({
      destination: row.destination,
      nextHop: row.nextHop,
      ...(row.metric !== undefined ? { metric: row.metric } : {}),
    }));
    onChange({ ...value, routes });
  };
  const edit = (index: number, patch: Partial<RouteRow>) =>
    update(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {plain ? (
        // Directly above the fields: on a phone the keyboard hides the brief and the diagram.
        <p data-testid={`${testId}-needs`} style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {t(
            'Destination: the network to reach (in the task above). Next router: the address of the neighbouring router, on the side facing this router. It is different for every router: a line of another router cannot be copied.',
            '行き先：届けたいネットワーク（上の問題文にあります）。次のルータ：となりのルータの、こちらを向いた側のアドレス。ルータごとにちがうので、ほかのルータの行は、そのままは写せません。',
          )}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p style={{ ...MUTED, margin: 0 }}>{t('No routes yet.', 'まだ経路はありません。')}</p>
      ) : null}
      {rows.map((row, index) => (
        <div
          key={index}
          role="group"
          aria-label={t(`Route ${index + 1}`, `経路 ${index + 1}`)}
          style={ROW_BOX}
        >
          <label style={CELL}>
            <span>
              {plain
                ? t('Destination network', '行き先のネットワーク')
                : t('Destination', '行き先')}
            </span>
            <input
              data-testid={`${testId}-row-${index}-destination`}
              type="text"
              // Not "decimal": on a phone that keyboard has no "/".
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={plain ? t('e.g. network/24', '例：ネットワーク/24') : ''}
              value={row.destination}
              onChange={(event) => edit(index, { destination: event.target.value.trim() })}
              style={{ ...INPUT, width: 170 }}
            />
          </label>
          <label style={CELL}>
            <span>
              {plain
                ? t('Next router (its address)', '次のルータのアドレス')
                : t('Next hop', 'ネクストホップ')}
            </span>
            <input
              data-testid={`${testId}-row-${index}-nexthop`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder=""
              value={row.nextHop}
              onChange={(event) => edit(index, { nextHop: event.target.value.trim() })}
              style={{ ...INPUT, width: 150 }}
            />
          </label>
          <button
            type="button"
            data-testid={`${testId}-row-${index}-remove`}
            aria-label={t(`Remove route ${index + 1}`, `経路 ${index + 1} を消す`)}
            onClick={() => update(rows.filter((_, at) => at !== index))}
            style={SMALL}
          >
            {t('Remove', '消す')}
          </button>
        </div>
      ))}
      {waiting > 0 ? (
        <p data-testid={`${testId}-note`} style={{ margin: 0, fontSize: 14 }}>
          <span aria-hidden="true">✎ </span>
          {t(
            `${waiting} ${waiting === 1 ? 'row is' : 'rows are'} not complete and not used yet. A destination is a network with its "/number" (four numbers with dots, then /24); the next router is an address (four numbers with dots).`,
            `${waiting} 行は、まだ書きかけなので使われません。行き先は「点で区切った 4 つの数/24」のようなネットワーク、次のルータは「点で区切った 4 つの数」のアドレスを書きます。`,
          )}
        </p>
      ) : null}
      <div>
        <button
          type="button"
          data-testid={`${testId}-add`}
          disabled={rows.length >= MAX_ROUTES}
          onClick={() => update([...rows, { destination: '', nextHop: '' }])}
          style={{ ...SECONDARY, opacity: rows.length >= MAX_ROUTES ? 0.6 : 1 }}
        >
          {t('+ Add a route', '＋ 経路を足す')}
        </button>
      </div>
      {rows.length >= MAX_ROUTES ? (
        <p data-testid={`${testId}-full`} style={{ ...MUTED, margin: 0, fontSize: 14 }}>
          {t(
            `This form takes ${MAX_ROUTES} routes at most. Remove one to add another.`,
            `ここに書ける経路は ${MAX_ROUTES} 行までです。足すには、どれかを消してください。`,
          )}
        </p>
      ) : null}
    </div>
  );
}

// --- iface-acl ---------------------------------------------------------------

interface AclRow {
  /** The rule this row started as; its id and unedited fields are kept. */
  readonly base?: AclRule;
  readonly id: string;
  readonly action: AclRule['action'];
  readonly protocol: AclRule['protocol'];
  readonly srcIp: string;
  readonly dstIp: string;
  readonly dstPort: string;
}

function toRow(rule: AclRule): AclRow {
  return {
    base: rule,
    id: rule.id,
    action: rule.action,
    protocol: rule.protocol,
    srcIp: rule.srcIp ?? '',
    dstIp: rule.dstIp ?? '',
    dstPort: typeof rule.dstPort === 'number' ? String(rule.dstPort) : '',
  };
}

/** Empty means "any"; one address means that one device. */
const whereUsable = (text: string) => text === '' || isAddress(text) || isNetwork(text);
const asNetwork = (text: string) => (isAddress(text) ? `${text}/32` : text);
const hasPort = (row: AclRow) => row.protocol === 'tcp' || row.protocol === 'udp';
/** A port range the row started with is kept as long as the port field is left empty. */
const portUsable = (row: AclRow) =>
  !hasPort(row) || row.dstPort === '' || wholeNumber(row.dstPort, 1, 65535) !== null;
const aclUsable = (row: AclRow) =>
  whereUsable(row.srcIp) && whereUsable(row.dstIp) && portUsable(row);

function toRule(row: AclRow, priority: number): AclRule {
  const { srcIp: _src, dstIp: _dst, dstPort: basePort, ...kept } = row.base ?? { id: row.id };
  const typedPort = wholeNumber(row.dstPort, 1, 65535);
  const dstPort = !hasPort(row)
    ? undefined
    : (typedPort ?? (row.dstPort === '' && typeof basePort === 'object' ? basePort : undefined));
  return {
    ...kept,
    id: row.id,
    priority,
    action: row.action,
    protocol: row.protocol,
    ...(row.srcIp !== '' ? { srcIp: asNetwork(row.srcIp) } : {}),
    ...(row.dstIp !== '' ? { dstIp: asNetwork(row.dstIp) } : {}),
    ...(dstPort !== undefined ? { dstPort } : {}),
  };
}

export function AclField({ value, onChange, testId, plain }: FieldProps<'iface-acl'>) {
  const t = useT();
  // The engine reads the rules in order of priority, so that is the order shown.
  const [start] = useState(() => [...value.rules].sort((a, b) => a.priority - b.priority));
  const [rows, setRows] = useState<readonly AclRow[]>(() => start.map(toRow));
  const [added, setAdded] = useState(0);
  const waiting = rows.filter((row) => !aclUsable(row)).length;

  const update = (next: readonly AclRow[]) => {
    setRows(next);
    const usable = next.filter(aclUsable);
    // The same number of rules keeps the priorities the exercise started with,
    // so putting everything back is not counted as a change.
    const priorities =
      usable.length === start.length
        ? start.map((rule) => rule.priority)
        : usable.map((_, index) => (index + 1) * 10);
    onChange({ ...value, rules: usable.map((row, index) => toRule(row, priorities[index] ?? 0)) });
  };
  const edit = (index: number, patch: Partial<AclRow>) =>
    update(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    if (!row) return;
    next.splice(index + by, 0, row);
    update(next);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p style={{ ...MUTED, margin: 0, fontSize: 14 }}>
        {rows.length === 0
          ? t(
              'No list: everything passes. Once there is a line, whatever no line allows is refused.',
              '一覧がないので、すべて通します。1 行でも書くと、どの行にも当てはまらない通信は通らなくなります。',
            )
          : t(
              'Read from the top; the first line that fits decides. Whatever no line fits is refused.',
              '上から順に調べ、最初に当てはまった行で決まります。どの行にも当てはまらない通信は通りません。',
            )}
      </p>
      {rows.map((row, index) => {
        const name = t(`Line ${index + 1}`, `${index + 1} 行目`);
        return (
          <div key={row.id} role="group" aria-label={name} style={ROW_BOX}>
            <strong style={{ alignSelf: 'center', minWidth: 24 }}>{index + 1}</strong>
            <label style={CELL}>
              <span>{t('Do', 'どうする')}</span>
              <select
                data-testid={`${testId}-row-${index}-action`}
                value={row.action}
                onChange={(event) =>
                  edit(index, { action: event.target.value === 'deny' ? 'deny' : 'permit' })
                }
                style={SELECT}
              >
                <option value="permit">{t('Allow', '通す')}</option>
                <option value="deny">{t('Refuse', '止める')}</option>
              </select>
            </label>
            <label style={CELL}>
              <span>{t('Kind', '種類')}</span>
              <select
                data-testid={`${testId}-row-${index}-protocol`}
                value={row.protocol}
                onChange={(event) =>
                  edit(index, { protocol: event.target.value as AclRule['protocol'] })
                }
                style={SELECT}
              >
                <option value="any">{t('Anything', 'すべて')}</option>
                <option value="icmp">{plain ? t('ping (icmp)', 'ping（icmp）') : 'icmp'}</option>
                <option value="tcp">tcp</option>
                <option value="udp">udp</option>
              </select>
            </label>
            <label style={CELL}>
              <span>{t('From (empty = anywhere)', '送り主（空ならどこからでも）')}</span>
              <input
                data-testid={`${testId}-row-${index}-src`}
                type="text"
                // An address may be followed by "/number", which the decimal keyboard of a phone lacks.
                inputMode="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder=""
                value={row.srcIp}
                onChange={(event) => edit(index, { srcIp: event.target.value.trim() })}
                style={{ ...INPUT, width: 170 }}
              />
            </label>
            <label style={CELL}>
              <span>{t('To (empty = anywhere)', '行き先（空ならどこへでも）')}</span>
              <input
                data-testid={`${testId}-row-${index}-dst`}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder=""
                value={row.dstIp}
                onChange={(event) => edit(index, { dstIp: event.target.value.trim() })}
                style={{ ...INPUT, width: 170 }}
              />
            </label>
            {hasPort(row) ? (
              <label style={CELL}>
                <span>{t('Port (empty = any)', 'ポート番号（空ならすべて）')}</span>
                <input
                  data-testid={`${testId}-row-${index}-port`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="80"
                  value={row.dstPort}
                  onChange={(event) => edit(index, { dstPort: event.target.value.trim() })}
                  style={{ ...INPUT, width: 90 }}
                />
              </label>
            ) : null}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                data-testid={`${testId}-row-${index}-up`}
                aria-label={t(`Move line ${index + 1} up`, `${index + 1} 行目を上へ`)}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                style={{ ...SMALL, opacity: index === 0 ? 0.5 : 1 }}
              >
                ↑
              </button>
              <button
                type="button"
                data-testid={`${testId}-row-${index}-down`}
                aria-label={t(`Move line ${index + 1} down`, `${index + 1} 行目を下へ`)}
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
                style={{ ...SMALL, opacity: index === rows.length - 1 ? 0.5 : 1 }}
              >
                ↓
              </button>
              <button
                type="button"
                data-testid={`${testId}-row-${index}-remove`}
                aria-label={t(`Remove line ${index + 1}`, `${index + 1} 行目を消す`)}
                onClick={() => update(rows.filter((_, at) => at !== index))}
                style={SMALL}
              >
                {t('Remove', '消す')}
              </button>
            </div>
          </div>
        );
      })}
      {waiting > 0 ? (
        <p data-testid={`${testId}-note`} style={{ margin: 0, fontSize: 14 }}>
          <span aria-hidden="true">✎ </span>
          {t(
            `${waiting} ${waiting === 1 ? 'line is' : 'lines are'} not complete and not used yet. Write an address like 192.168.1.10, or a network like 192.168.1.0/24.`,
            `${waiting} 行は、まだ書きかけなので使われません。アドレスは「192.168.1.10」、ネットワークは「192.168.1.0/24」のように書きます。`,
          )}
        </p>
      ) : null}
      <div>
        <button
          type="button"
          data-testid={`${testId}-add`}
          disabled={rows.length >= MAX_ACL_RULES}
          onClick={() => {
            setAdded((count) => count + 1);
            update([
              ...rows,
              {
                id: `added-${added + 1}`,
                action: 'permit',
                protocol: 'any',
                srcIp: '',
                dstIp: '',
                dstPort: '',
              },
            ]);
          }}
          style={{ ...SECONDARY, opacity: rows.length >= MAX_ACL_RULES ? 0.6 : 1 }}
        >
          {t('+ Add a line', '＋ 行を足す')}
        </button>
      </div>
      {rows.length >= MAX_ACL_RULES ? (
        <p data-testid={`${testId}-full`} style={{ ...MUTED, margin: 0, fontSize: 14 }}>
          {t(
            `This list takes ${MAX_ACL_RULES} lines at most. Remove one to add another.`,
            `この一覧に書けるのは ${MAX_ACL_RULES} 行までです。足すには、どれかを消してください。`,
          )}
        </p>
      ) : null}
    </div>
  );
}

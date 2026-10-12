import { useMemo, useState } from 'react';
import type { TopologySnapshot } from '../../../src/types/topology';
import { useGalleryLocale, useT } from '../../localeContext';
import { pickKey, type PickBy } from '../model/pick';
import { diffSettings, readSetting } from '../model/settings';
import type { Exercise, SettingChange, SettingRef } from '../model/types';
import { FIRST_ORDER, type AttemptOrder } from './attemptOrder';
import { pressCards } from './choices';
import { settingTestId, settingTitle } from './describe';
import {
  HostIpField,
  IfaceAddressField,
  IfaceNatField,
  LinkStateField,
  OspfCostField,
  PortVlanField,
  StpPortField,
  StpPriorityField,
} from './fields';
import { AclField, StaticRoutesField } from './listFields';
import { CARD, SECONDARY } from './styles';

type FormExercise = Pick<Exercise, 'id' | 'allowed' | 'start' | 'level'> &
  Partial<Pick<Exercise, 'pickFirst'>>;

/** A point-first exercise (`Exercise.pickFirst`): what the learner points at, as keys (`model/pick.ts`). */
export interface SuspectState {
  /** What is pointed at now; its card is open. It can be changed until Check. */
  readonly picked: string | null;
  /** What was pointed at when Check was pressed, and was fine. */
  readonly cleared: readonly string[];
  /** Check was pressed before anything was pointed at: the step is said as what is missing. */
  readonly needed?: boolean;
  /** Devices, or the sides of one device. */
  readonly by?: PickBy;
  readonly onPick: (key: string) => void;
}

/** What a closed card shows of its setting: the value, to compare with the others. */
function valueNow(value: SettingChange, none: string): string | null {
  if (value.kind === 'host-ip') return value.ip ?? none;
  if (value.kind === 'iface-address') return value.ipAddress;
  return null;
}

interface SettingsFormProps {
  readonly exercise: FormExercise;
  /** The start with the learner's changes applied. */
  readonly topology: TopologySnapshot;
  readonly onChange: (change: SettingChange) => void;
  /** The order of this attempt: where the usable chip stands. */
  readonly order?: AttemptOrder;
  /** Only for an exercise with `pickFirst`. */
  readonly suspect?: SuspectState;
  /** The learner turned to this setting: the page marks its device on the diagram. */
  readonly onFocusSetting?: (ref: SettingRef) => void;
  /** The setting a press on the diagram pointed at: its card is outlined. */
  readonly pointed?: SettingRef | null;
}

function Field({
  value,
  setting,
  candidates,
  exercise,
  onChange,
  testId,
}: {
  value: SettingChange;
  setting: SettingRef;
  /** Address chips, in the order of the attempt. They come from the start state, so they do not move as the learner types. */
  candidates: readonly string[];
  exercise: FormExercise;
  onChange: (change: SettingChange) => void;
  testId: string;
}) {
  const plain = exercise.level <= 2;
  const shared = { onChange, testId, plain };
  switch (value.kind) {
    case 'host-ip':
      return <HostIpField value={value} candidates={candidates} {...shared} />;
    case 'iface-address':
      return (
        <IfaceAddressField
          value={value}
          candidates={candidates}
          addressOnly={setting.kind === 'iface-address' && setting.addressOnly === true}
          {...shared}
        />
      );
    case 'link-state':
      return <LinkStateField value={value} {...shared} />;
    case 'port-vlan':
      return (
        <PortVlanField
          value={value}
          fixedMode={setting.kind === 'port-vlan' && setting.fixedMode === true}
          {...shared}
        />
      );
    case 'stp-priority':
      return <StpPriorityField value={value} {...shared} />;
    case 'stp-port':
      return <StpPortField value={value} {...shared} />;
    case 'static-routes':
      return <StaticRoutesField value={value} {...shared} />;
    case 'ospf-cost':
      return <OspfCostField value={value} {...shared} />;
    case 'iface-acl':
      return <AclField value={value} {...shared} />;
    case 'iface-nat':
      return <IfaceNatField value={value} {...shared} />;
  }
}

/** One card per setting the exercise allows, and nothing else. */
export function SettingsForm({
  exercise,
  topology,
  onChange,
  onFocusSetting,
  pointed = null,
  order = FIRST_ORDER,
  suspect,
}: SettingsFormProps) {
  const locale = useGalleryLocale();
  const t = useT();
  // The start state decides the cards and their chips, so nothing moves while the learner works.
  const cards = useMemo(() => pressCards(exercise, order), [exercise, order]);
  /** Bumped per card when its setting is put back, so a half-typed draft is dropped. */
  const [undone, setUndone] = useState<Readonly<Record<string, number>>>({});
  const picking = exercise.pickFirst !== undefined && suspect !== undefined;
  const by = suspect?.by ?? 'device';
  const keys = cards.flatMap(({ ref }) => pickKey(ref, by) ?? []);
  const left = keys.filter((key) => !suspect?.cleared.includes(key)).length;
  const asked = picking && suspect.needed === true && suspect.picked === null;
  return (
    <div data-testid="exercise-settings" style={{ display: 'grid', gap: 12 }}>
      {picking ? (
        <p
          data-testid="exercise-suspect-step"
          data-needed={asked ? '' : undefined}
          role={asked ? 'alert' : undefined}
          style={{
            margin: 0,
            fontWeight: 700,
            scrollMarginTop: 60,
            scrollMarginBottom: 120,
            ...(asked ? { color: 'var(--netlab-accent-orange)' } : {}),
          }}
        >
          {asked ? <span aria-hidden="true">☞ </span> : null}
          {suspect.picked === null
            ? by === 'side'
              ? t(
                  '1. Choose the side you think is wrong.',
                  '1. まちがっていると思う側を えらんでください。',
                )
              : t(
                  '1. Choose the device you think is wrong.',
                  '1. おかしいと思う機器を 1 台えらんでください。',
                )
            : by === 'side'
              ? t(
                  '2. Fix it, then press Check. (You can still choose the other side.)',
                  '2. 直して「たしかめる」を押してください（えらび直せます）。',
                )
              : t(
                  '2. Fix it, then press Check. (You can still choose another device.)',
                  '2. 直して「たしかめる」を押してください（えらび直せます）。',
                )}
        </p>
      ) : null}
      {cards.map(({ ref, chips }) => {
        // A setting whose target is missing, or whose state no change can
        // express, has nothing to edit; an ACL that reads as null is edited
        // from an empty list.
        const value: SettingChange | null =
          readSetting(topology, ref) ?? (ref.kind === 'iface-acl' ? { ...ref, rules: [] } : null);
        if (value === null) return null;
        const testId = settingTestId(ref);
        const isPointed = pointed !== null && settingTestId(pointed) === testId;
        const title = settingTitle(ref, exercise.start);
        const atStart: SettingChange | null =
          readSetting(exercise.start, ref) ??
          (ref.kind === 'iface-acl' ? { ...ref, rules: [] } : null);
        const changed = diffSettings(exercise.start, topology, [ref]).length > 0;
        const key = pickKey(ref, by);
        const isPicked = picking && key !== null && suspect.picked === key;
        // Shut: not what is pointed at. One row, so that every one of them is on screen at once.
        const shut = picking && key !== null && suspect.picked !== key;
        return (
          <section
            key={testId}
            data-testid={testId}
            data-pointed={isPointed ? '' : undefined}
            data-picked={isPicked ? '' : undefined}
            aria-label={`${title.device[locale]} — ${title.name[locale]}`}
            onFocusCapture={() => onFocusSetting?.(ref)}
            onPointerDown={() => onFocusSetting?.(ref)}
            style={{
              ...CARD,
              padding: shut ? '8px 12px' : 12,
              display: 'grid',
              gap: 8,
              scrollMarginBottom: 96,
              scrollMarginTop: 8,
              ...(isPointed
                ? { outline: '3px solid var(--netlab-accent-cyan)', outlineOffset: 0 }
                : {}),
            }}
          >
            {shut ? null : (
              <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
                <span>{title.device[locale]}</span>
                <span style={{ fontWeight: 400 }}> — {title.name[locale]}</span>
              </h3>
            )}
            {picking && key !== null && suspect.picked !== key ? (
              // Shut: one line with the value to compare and the button that points at it.
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>
                    <span>{title.device[locale]}</span>
                    {by === 'side' ? (
                      <span style={{ fontWeight: 400 }}> — {title.name[locale]}</span>
                    ) : null}
                  </h3>
                  {valueNow(value, t('none', 'なし')) === null ? null : (
                    <p data-testid={`${testId}-current`} style={{ margin: 0, lineHeight: 1.4 }}>
                      {by === 'side' ? '' : t('Address: ', 'アドレス：')}
                      <strong style={{ fontFamily: 'ui-monospace, monospace' }}>
                        {valueNow(value, t('none', 'なし'))}
                      </strong>
                    </p>
                  )}
                </div>
                {suspect.cleared.includes(key) ? (
                  <p
                    role="status"
                    data-testid={`exercise-suspect-note-${key}`}
                    style={{ margin: 0, flex: '1 1 100%' }}
                  >
                    <span aria-hidden="true">○ </span>
                    {by === 'side'
                      ? t(
                          'This side’s address matches the devices on it. Compare the other side with its devices. (From here on, a pass is recorded as “solved after several tries”.)',
                          'こちら側のアドレスは、つながっている機器と合っています。もう一方の側を、その側の機器と見くらべてください。（ここからは、解けても「何度かためして解けた」として記録されます。）',
                        )
                      : t(
                          `This device’s address matches the devices around it. Compare the other ${left === 1 ? 'one' : left} with ${left === 1 ? 'its' : 'their'} neighbours. (From here on, a pass is recorded as “solved after several tries”.)`,
                          `この機器のアドレスは、まわりと合っています。ほかの ${left} 台を、となりの機器と見くらべてください。（ここからは、解けても「何度かためして解けた」として記録されます。）`,
                        )}
                  </p>
                ) : (
                  <button
                    type="button"
                    data-testid={`exercise-suspect-${key}`}
                    onClick={() => suspect.onPick(key)}
                    style={{ ...SECONDARY, fontSize: 16, borderWidth: 2 }}
                  >
                    {by === 'side'
                      ? t('This side is wrong', 'こちらがまちがっている')
                      : t('This is the one that is wrong', 'この機器がおかしい')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <Field
                  key={undone[testId] ?? 0}
                  value={value}
                  setting={ref}
                  candidates={chips}
                  exercise={exercise}
                  onChange={onChange}
                  testId={testId}
                />
                {/* Always here once the setting differs from the start: a learner who
                changed a device that was fine has to be able to put it back. */}
                {changed && atStart !== null ? (
                  <div>
                    <button
                      type="button"
                      data-testid={`${testId}-undo`}
                      onClick={() => {
                        onChange(atStart);
                        setUndone((now) => ({ ...now, [testId]: (now[testId] ?? 0) + 1 }));
                      }}
                      style={{ ...SECONDARY, fontSize: 15 }}
                    >
                      <span aria-hidden="true">↩ </span>
                      {t('Put this one back', 'これを元に戻す')}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

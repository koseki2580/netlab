import { useMemo } from 'react';
import type { TopologySnapshot } from '../../../src/types/topology';
import { useGalleryLocale } from '../../localeContext';
import { readSetting } from '../model/settings';
import type { Exercise, SettingChange, SettingRef } from '../model/types';
import { addressCandidates } from './candidates';
import { settingTestId, settingTitle } from './describe';
import { settingOrder } from './settingOrder';
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
import { CARD } from './styles';

type FormExercise = Pick<Exercise, 'allowed' | 'start' | 'level' | 'seed'>;

interface SettingsFormProps {
  readonly exercise: FormExercise;
  /** The start with the learner's changes applied. */
  readonly topology: TopologySnapshot;
  readonly onChange: (change: SettingChange) => void;
  /** The learner turned to this setting: the page marks its device on the diagram. */
  readonly onFocusSetting?: (ref: SettingRef) => void;
  /** The setting a press on the diagram pointed at: its card is outlined. */
  readonly pointed?: SettingRef | null;
}

function Field({
  value,
  exercise,
  onChange,
  testId,
}: {
  value: SettingChange;
  exercise: FormExercise;
  onChange: (change: SettingChange) => void;
  testId: string;
}) {
  const plain = exercise.level <= 2;
  // Chips come from the start state, so they do not move as the learner types.
  const hostId = value.kind === 'host-ip' && plain ? value.nodeId : null;
  const candidates = useMemo(
    () => (hostId === null ? [] : addressCandidates(exercise.start, hostId, exercise.seed)),
    [exercise.seed, exercise.start, hostId],
  );
  const shared = { onChange, testId, plain };
  switch (value.kind) {
    case 'host-ip':
      return <HostIpField value={value} candidates={candidates} {...shared} />;
    case 'iface-address':
      return <IfaceAddressField value={value} {...shared} />;
    case 'link-state':
      return <LinkStateField value={value} {...shared} />;
    case 'port-vlan':
      return <PortVlanField value={value} {...shared} />;
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
}: SettingsFormProps) {
  const locale = useGalleryLocale();
  // The start state decides the order, so a card never moves while the learner works.
  const ordered = useMemo(
    () => settingOrder(exercise.allowed, exercise.start),
    [exercise.allowed, exercise.start],
  );
  return (
    <div data-testid="exercise-settings" style={{ display: 'grid', gap: 12 }}>
      {ordered.map((ref) => {
        // A setting whose target is missing, or whose state no change can
        // express, has nothing to edit; an ACL that reads as null is edited
        // from an empty list.
        const value: SettingChange | null =
          readSetting(topology, ref) ?? (ref.kind === 'iface-acl' ? { ...ref, rules: [] } : null);
        if (value === null) return null;
        const testId = settingTestId(ref);
        const isPointed = pointed !== null && settingTestId(pointed) === testId;
        const title = settingTitle(ref, exercise.start);
        return (
          <section
            key={testId}
            data-testid={testId}
            data-pointed={isPointed ? '' : undefined}
            aria-label={`${title.device[locale]} — ${title.name[locale]}`}
            onFocusCapture={() => onFocusSetting?.(ref)}
            onPointerDown={() => onFocusSetting?.(ref)}
            style={{
              ...CARD,
              padding: 12,
              display: 'grid',
              gap: 8,
              scrollMarginBottom: 96,
              scrollMarginTop: 8,
              ...(isPointed
                ? { outline: '3px solid var(--netlab-accent-cyan)', outlineOffset: 0 }
                : {}),
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
              <span>{title.device[locale]}</span>
              <span style={{ fontWeight: 400 }}> — {title.name[locale]}</span>
            </h3>
            <Field value={value} exercise={exercise} onChange={onChange} testId={testId} />
          </section>
        );
      })}
    </div>
  );
}

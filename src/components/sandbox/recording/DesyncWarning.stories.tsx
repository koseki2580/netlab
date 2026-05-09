import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxReplayContext,
  type ReplayContextValue,
} from '../../../sandbox/recording/useReplay';
import { buildRecording } from '../../../testing/fixtures/sandbox';
import { DesyncWarning } from './DesyncWarning';

const recording = buildRecording();

function makeReplayValue(overrides: Partial<ReplayContextValue> = {}): ReplayContextValue {
  return {
    isActive: true,
    status: 'desynced',
    currentSeq: 1,
    totalEvents: recording.events.length,
    speed: 1,
    recording,
    currentSnapshot: recording.initialSnapshot,
    desyncEvent: recording.events[1] ?? null,
    dismissDesync: () => {},
    play: () => {},
    pause: () => {},
    stepForward: () => {},
    stepBackward: () => {},
    seek: () => {},
    setSpeed: () => {},
    fork: () => recording.initialSnapshot,
    forkedSnapshot: null,
    ...overrides,
  };
}

const meta: Meta<typeof DesyncWarning> = {
  title: 'Sandbox/Recording/DesyncWarning',
  component: DesyncWarning,
};

export default meta;

type Story = StoryObj<typeof DesyncWarning>;

export const Desynced: Story = {
  decorators: [
    (Story) => (
      <SandboxReplayContext.Provider value={makeReplayValue()}>
        <Story />
      </SandboxReplayContext.Provider>
    ),
  ],
};

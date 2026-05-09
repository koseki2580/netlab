import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxReplayContext,
  type ReplayContextValue,
} from '../../../sandbox/recording/useReplay';
import { buildRecording } from '../../../testing/fixtures/sandbox';
import { ReplayScrubber } from './ReplayScrubber';

const recording = buildRecording();

function makeReplayValue(overrides: Partial<ReplayContextValue> = {}): ReplayContextValue {
  return {
    isActive: true,
    status: 'paused',
    currentSeq: -1,
    totalEvents: recording.events.length,
    speed: 1,
    recording,
    currentSnapshot: recording.initialSnapshot,
    desyncEvent: null,
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

const meta: Meta<typeof ReplayScrubber> = {
  title: 'Sandbox/Recording/ReplayScrubber',
  component: ReplayScrubber,
};

export default meta;

type Story = StoryObj<typeof ReplayScrubber>;

export const PausedAtStart: Story = {
  decorators: [
    (Story) => (
      <SandboxReplayContext.Provider value={makeReplayValue()}>
        <Story />
      </SandboxReplayContext.Provider>
    ),
  ],
};

export const PlayingMidway: Story = {
  decorators: [
    (Story) => (
      <SandboxReplayContext.Provider
        value={makeReplayValue({ status: 'playing', currentSeq: 1, speed: 2 })}
      >
        <Story />
      </SandboxReplayContext.Provider>
    ),
  ],
};

export const Finished: Story = {
  decorators: [
    (Story) => (
      <SandboxReplayContext.Provider
        value={makeReplayValue({ status: 'finished', currentSeq: recording.events.length - 1 })}
      >
        <Story />
      </SandboxReplayContext.Provider>
    ),
  ],
};

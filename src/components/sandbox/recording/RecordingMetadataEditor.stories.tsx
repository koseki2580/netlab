import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxRecorderContext,
  type SandboxRecorderContextValue,
} from '../../../sandbox/recording/SandboxRecorderProvider';
import { buildRecording } from '../../../testing/fixtures/sandbox';
import { RecordingMetadataEditor } from './RecordingMetadataEditor';

const recording = buildRecording();

const recorderValue: SandboxRecorderContextValue = {
  isRecording: true,
  eventCount: recording.events.length,
  limitReached: false,
  warnThresholdReached: false,
  stopAndExport: () => recording,
};

const meta: Meta<typeof RecordingMetadataEditor> = {
  title: 'Sandbox/Recording/RecordingMetadataEditor',
  component: RecordingMetadataEditor,
  args: {
    scenarioId: 'fragmented-echo',
    open: true,
    onClose: () => {},
    download: () => {},
  },
  decorators: [
    (Story) => (
      <SandboxRecorderContext.Provider value={recorderValue}>
        <Story />
      </SandboxRecorderContext.Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RecordingMetadataEditor>;

export const Open: Story = {};

export const ApproachingLimit: Story = {
  decorators: [
    (Story) => (
      <SandboxRecorderContext.Provider
        value={{ ...recorderValue, eventCount: 9000, warnThresholdReached: true }}
      >
        <Story />
      </SandboxRecorderContext.Provider>
    ),
  ],
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { SandboxStoryDecorator, buildSnapshot } from '../../../testing/fixtures/sandbox';
import { SaveSnapshotButton } from './SaveSnapshotButton';

const meta: Meta<typeof SaveSnapshotButton> = {
  title: 'Sandbox/Snapshots/SaveSnapshotButton',
  component: SaveSnapshotButton,
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={buildSnapshot('mtu')}>
        <div style={{ position: 'relative', minHeight: 280 }}>
          <Story />
        </div>
      </SandboxStoryDecorator>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SaveSnapshotButton>;

export const Default: Story = {};

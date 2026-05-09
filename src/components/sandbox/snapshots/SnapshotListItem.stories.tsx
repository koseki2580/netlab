import type { Meta, StoryObj } from '@storybook/react-vite';
import type { NamedSnapshot } from '../../../sandbox/snapshots/types';
import { SandboxStoryDecorator, buildSnapshot } from '../../../testing/fixtures/sandbox';
import { SnapshotListItem } from './SnapshotListItem';

const baseSnapshot: NamedSnapshot = {
  id: 'snap-1',
  name: 'Before MTU drop',
  editIndex: 0,
  sessionIdAtCapture: 'fixture',
  createdAt: 0,
};

const meta: Meta<typeof SnapshotListItem> = {
  title: 'Sandbox/Snapshots/SnapshotListItem',
  component: SnapshotListItem,
  args: {
    snapshot: baseSnapshot,
    onCompare: () => {},
    onRename: () => {},
    onDelete: () => {},
  },
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={buildSnapshot('mtu')}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <Story />
        </ul>
      </SandboxStoryDecorator>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SnapshotListItem>;

export const Active: Story = {};

export const CompareSelected: Story = { args: { compareSelected: true } };

export const Orphaned: Story = { args: { orphaned: true } };

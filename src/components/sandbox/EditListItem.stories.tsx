import type { Meta, StoryObj } from '@storybook/react-vite';
import { EDITS } from '../../testing/fixtures/sandbox';
import { EditListItem } from './EditListItem';

const meta: Meta<typeof EditListItem> = {
  title: 'Sandbox/EditListItem',
  component: EditListItem,
  args: {
    edit: EDITS.mtu,
    index: 0,
    active: true,
    onRevert: () => {},
    onUndoTo: () => {},
  },
  decorators: [
    (Story) => (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        <Story />
      </ul>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof EditListItem>;

export const ActiveMtuEdit: Story = {};

export const ParameterEdit: Story = { args: { edit: EDITS.param, index: 1 } };

export const TrafficLaunch: Story = { args: { edit: EDITS.traffic, index: 2 } };

export const RedoTailEntry: Story = {
  args: { edit: EDITS.mtu, index: 3, active: false },
};

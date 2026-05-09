import type { Meta, StoryObj } from '@storybook/react-vite';
import { LargeTopologyWarning } from './LargeTopologyWarning';

const meta: Meta<typeof LargeTopologyWarning> = {
  title: 'Sandbox/LargeTopologyWarning',
  component: LargeTopologyWarning,
  args: {
    nodeCount: 120,
    fastMode: false,
    onEnableFastMode: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof LargeTopologyWarning>;

export const NoWarning: Story = { args: { nodeCount: 50 } };

export const WarningSeverity: Story = { args: { nodeCount: 120 } };

export const CriticalSeverity: Story = { args: { nodeCount: 220 } };

export const FastModeAlreadyOn: Story = {
  args: { nodeCount: 220, fastMode: true },
};

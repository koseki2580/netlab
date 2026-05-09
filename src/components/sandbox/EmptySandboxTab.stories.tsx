import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptySandboxTab } from './EmptySandboxTab';

const meta: Meta<typeof EmptySandboxTab> = {
  title: 'Sandbox/EmptySandboxTab',
  component: EmptySandboxTab,
  args: { axis: 'packet' },
  argTypes: {
    axis: {
      control: { type: 'inline-radio' },
      options: ['packet', 'node', 'parameters', 'traffic'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof EmptySandboxTab>;

export const PacketAxis: Story = {};

export const NodeAxis: Story = { args: { axis: 'node' } };

export const ParametersAxis: Story = { args: { axis: 'parameters' } };

export const TrafficAxis: Story = { args: { axis: 'traffic' } };

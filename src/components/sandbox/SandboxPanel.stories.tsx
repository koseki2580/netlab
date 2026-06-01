import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxStoryDecorator,
  buildSnapshot,
  threeEditsSession,
} from '../../testing/fixtures/sandbox';
import { SandboxPanel } from './SandboxPanel';

const arpSnapshot = buildSnapshot('arp');
const mtuSnapshot = buildSnapshot('mtu');

const meta: Meta<typeof SandboxPanel> = {
  title: 'Sandbox/SandboxPanel',
  component: SandboxPanel,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      // The panel uses CSS variables that are not present in Storybook's
      // bare canvas. Color-contrast violations produced by var() fallbacks
      // are not covered by this story.
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof SandboxPanel>;

export const AlphaModeArp: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={arpSnapshot} mode="alpha">
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

export const BetaModeWithEdits: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={mtuSnapshot} mode="beta" session={threeEditsSession()}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

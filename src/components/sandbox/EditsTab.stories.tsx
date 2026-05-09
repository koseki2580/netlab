import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxStoryDecorator,
  annotationEditsSession,
  buildSnapshot,
  emptySession,
  midReplaySession,
  threeEditsSession,
} from '../../testing/fixtures/sandbox';
import { EditsTab } from './EditsTab';

const baseSnapshot = buildSnapshot('mtu');

const meta: Meta<typeof EditsTab> = {
  title: 'Sandbox/EditsTab',
  component: EditsTab,
  parameters: {
    a11y: {
      // Same color-contrast caveat as SandboxPanel.
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof EditsTab>;

export const Empty: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={baseSnapshot} session={emptySession()}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

export const ThreeEditsActive: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={baseSnapshot} session={threeEditsSession()}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

export const MidReplayWithRedoTail: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={baseSnapshot} session={midReplaySession()}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

export const AnnotationsOnly: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={baseSnapshot} session={annotationEditsSession()}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

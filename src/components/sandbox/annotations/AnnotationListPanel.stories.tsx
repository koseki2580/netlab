import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxStoryDecorator,
  annotationFixtures,
  buildSnapshot,
} from '../../../testing/fixtures/sandbox';
import { AnnotationListPanel } from './AnnotationListPanel';

const meta: Meta<typeof AnnotationListPanel> = {
  title: 'Sandbox/Annotations/AnnotationListPanel',
  component: AnnotationListPanel,
};

export default meta;

type Story = StoryObj<typeof AnnotationListPanel>;

const emptySnapshot = buildSnapshot('arp');
const populatedSnapshot = buildSnapshot('arp', {
  preseedAnnotations: annotationFixtures(),
});

export const Empty: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={emptySnapshot}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

export const PopulatedWithMixedAuthors: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={populatedSnapshot}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

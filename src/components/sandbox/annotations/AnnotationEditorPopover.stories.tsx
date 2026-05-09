import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxStoryDecorator,
  annotationFixtures,
  buildSnapshot,
} from '../../../testing/fixtures/sandbox';
import { AnnotationEditorPopover } from './AnnotationEditorPopover';

const annotations = annotationFixtures();
const snapshotWithAnnotations = buildSnapshot('mtu', { preseedAnnotations: annotations });
const blankSnapshot = buildSnapshot('mtu');

const meta: Meta<typeof AnnotationEditorPopover> = {
  title: 'Sandbox/Annotations/AnnotationEditorPopover',
  component: AnnotationEditorPopover,
  args: {
    traceEventId: 'evt-1',
    onClose: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof AnnotationEditorPopover>;

export const NewAnnotation: Story = {
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={blankSnapshot}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

export const EditingScenarioAnnotation: Story = {
  args: { annotationId: 'ann-1' },
  decorators: [
    (Story) => (
      <SandboxStoryDecorator snapshot={snapshotWithAnnotations}>
        <Story />
      </SandboxStoryDecorator>
    ),
  ],
};

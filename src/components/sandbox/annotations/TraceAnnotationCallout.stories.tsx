import type { Meta, StoryObj } from '@storybook/react-vite';
import { annotationFixtures } from '../../../testing/fixtures/sandbox';
import { TraceAnnotationCallout } from './TraceAnnotationCallout';

const [scenarioAnnotation, userAnnotation] = annotationFixtures();
if (!scenarioAnnotation || !userAnnotation) throw new Error('annotation fixtures missing');

const meta: Meta<typeof TraceAnnotationCallout> = {
  title: 'Sandbox/Annotations/TraceAnnotationCallout',
  component: TraceAnnotationCallout,
  args: {
    annotation: scenarioAnnotation,
    count: 1,
    onClick: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof TraceAnnotationCallout>;

export const SingleScenarioAnnotation: Story = {};

export const SingleUserAnnotation: Story = {
  args: { annotation: userAnnotation },
};

export const Stacked: Story = {
  args: { count: 4 },
};

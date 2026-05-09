import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AssessmentSubgoal } from '../../assessments/types';
import { SubgoalListItem } from './SubgoalListItem';

const subgoal: AssessmentSubgoal = {
  id: 'reach-target',
  title: 'Reach 10.0.0.5 from router-1',
  required: true,
  predicate: () => false,
  hints: [
    { tier: 1, content: 'Try adding a static route on router-1.' },
    { tier: 2, content: 'The next hop should be router-2 via eth1.' },
  ],
};

const meta: Meta<typeof SubgoalListItem> = {
  title: 'Assessments/SubgoalListItem',
  component: SubgoalListItem,
  args: {
    subgoal,
    result: { subgoalId: subgoal.id, passed: false },
    hintsUsed: [],
    onUseHint: () => {},
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

type Story = StoryObj<typeof SubgoalListItem>;

export const NotPassedNoHints: Story = {};

export const HintRevealed: Story = {
  args: {
    hintsUsed: [{ subgoalId: subgoal.id, tier: 1 }],
  },
};

export const Passed: Story = {
  args: {
    result: { subgoalId: subgoal.id, passed: true },
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { PassCelebration } from './PassCelebration';

const meta: Meta<typeof PassCelebration> = {
  title: 'Assessments/PassCelebration',
  component: PassCelebration,
  args: {
    onSubmit: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof PassCelebration>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SandboxIntroContext,
  type SandboxIntroContextValue,
} from '../../sandbox/intro/SandboxIntroProvider';
import { sandboxIntroMtu } from '../../sandbox/intro/sandboxIntroMtu';
import { SandboxIntroOverlay } from './SandboxIntroOverlay';

function makeIntro(overrides: Partial<SandboxIntroContextValue> = {}): SandboxIntroContextValue {
  const firstStep = sandboxIntroMtu.steps[0] ?? null;
  return {
    intro: sandboxIntroMtu,
    status: 'pending',
    currentStepIndex: 0,
    totalSteps: sandboxIntroMtu.steps.length,
    currentStep: firstStep,
    start: () => {},
    skip: () => {},
    restart: () => {},
    ...overrides,
  };
}

const meta: Meta<typeof SandboxIntroOverlay> = {
  title: 'Sandbox/SandboxIntroOverlay',
  component: SandboxIntroOverlay,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof SandboxIntroOverlay>;

export const Pending: Story = {
  decorators: [
    (Story) => (
      <SandboxIntroContext.Provider value={makeIntro({ status: 'pending' })}>
        <div style={{ position: 'relative', minHeight: 360, padding: 24 }}>
          <Story />
        </div>
      </SandboxIntroContext.Provider>
    ),
  ],
};

export const Active: Story = {
  decorators: [
    (Story) => (
      <SandboxIntroContext.Provider
        value={makeIntro({
          status: 'active',
          currentStepIndex: 1,
          currentStep: sandboxIntroMtu.steps[1] ?? null,
        })}
      >
        <div style={{ position: 'relative', minHeight: 360, padding: 24 }}>
          <Story />
        </div>
      </SandboxIntroContext.Provider>
    ),
  ],
};

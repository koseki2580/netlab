import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { NetlabError } from '../../errors';
import { SandboxErrorBoundary } from './SandboxErrorBoundary';

const meta: Meta<typeof SandboxErrorBoundary> = {
  title: 'Sandbox/SandboxErrorBoundary',
  component: SandboxErrorBoundary,
};

export default meta;

type Story = StoryObj<typeof SandboxErrorBoundary>;

function Healthy() {
  return <p>Sandbox is rendering normally.</p>;
}

function ThrowsTutorialConflict({ trigger }: { readonly trigger: boolean }) {
  if (trigger) {
    throw new NetlabError({
      code: 'sandbox/tutorial-conflict',
      message: 'Tutorial active; sandbox blocked.',
    });
  }
  return <p>Click the button to throw a tutorial-conflict error.</p>;
}

function FaultTrigger() {
  const [triggered, setTriggered] = useState(false);
  useEffect(() => {
    setTriggered(true);
  }, []);
  return <ThrowsTutorialConflict trigger={triggered} />;
}

export const Healthy_: Story = {
  name: 'Healthy children',
  render: () => (
    <SandboxErrorBoundary>
      <Healthy />
    </SandboxErrorBoundary>
  ),
};

export const TutorialConflictCaught: Story = {
  name: 'Tutorial conflict caught',
  render: () => (
    <SandboxErrorBoundary>
      <FaultTrigger />
    </SandboxErrorBoundary>
  ),
};

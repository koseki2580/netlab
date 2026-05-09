import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditPopover } from './EditPopover';

const meta: Meta<typeof EditPopover> = {
  title: 'Sandbox/EditPopover',
  component: EditPopover,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof EditPopover>;

function PopoverHarness({
  anchor,
  body,
  initialOpen = true,
}: {
  readonly anchor: React.ComponentProps<typeof EditPopover>['anchor'];
  readonly body: React.ReactNode;
  readonly initialOpen?: boolean;
}) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(initialOpen);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setAnchorElement(anchorRef.current);
  }, []);

  return (
    <div style={{ padding: 64 }}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((next) => !next)}
        aria-expanded={open}
      >
        Edit anchor
      </button>
      {open ? (
        <EditPopover
          anchor={anchor}
          anchorElement={anchorElement}
          labelledBy="story-popover"
          onDismiss={() => setOpen(false)}
        >
          <h2 id="story-popover" style={{ margin: '0 0 8px', fontSize: 14 }}>
            Edit MTU
          </h2>
          {body}
        </EditPopover>
      ) : null}
    </div>
  );
}

export const InterfaceMtuEdit: Story = {
  render: () => (
    <PopoverHarness
      anchor={{ kind: 'interface', nodeId: 'router-r1', ifaceId: 'eth0' }}
      body={
        <form>
          <label htmlFor="mtu-input" style={{ display: 'block' }}>
            MTU
          </label>
          <input id="mtu-input" type="number" defaultValue={800} aria-describedby="mtu-help" />
          <p id="mtu-help" style={{ margin: '8px 0 0', fontSize: 12 }}>
            Press Esc to dismiss.
          </p>
        </form>
      }
    />
  ),
};

export const PacketHeaderEdit: Story = {
  render: () => (
    <PopoverHarness
      anchor={{ kind: 'packet', traceId: 'trace-1', hopIndex: 2 }}
      body={
        <p style={{ margin: 0 }}>The popover focus-traps Tab/Shift+Tab and dismisses on Escape.</p>
      }
    />
  ),
};

/* @vitest-environment jsdom */

import { act, Component, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabError } from '../../errors';
import { SandboxErrorBoundary } from './SandboxErrorBoundary';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

class Thrower extends Component<{ readonly error: unknown }> {
  render(): ReactNode {
    throw this.props.error;
    return null;
  }
}

function render(ui: ReactNode) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

describe('SandboxErrorBoundary', () => {
  it('renders an inline warning for sandbox tutorial conflicts', () => {
    render(
      <SandboxErrorBoundary>
        <Thrower
          error={
            new NetlabError({
              code: 'sandbox/tutorial-conflict',
              message: 'conflict',
            })
          }
        />
      </SandboxErrorBoundary>,
    );

    expect(container?.textContent).toContain('Sandbox is unavailable during tutorials.');
    expect(container?.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('rethrows non-sandbox errors', () => {
    expect(() =>
      render(
        <SandboxErrorBoundary>
          <Thrower error={new Error('boom')} />
        </SandboxErrorBoundary>,
      ),
    ).toThrow('boom');
  });
});

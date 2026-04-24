import { Component, type ErrorInfo, type ReactNode } from 'react';
import { NetlabError } from '../../errors';

export interface SandboxErrorBoundaryProps {
  readonly children: ReactNode;
}

export interface SandboxErrorBoundaryState {
  readonly error: NetlabError | null;
}

export class SandboxErrorBoundary extends Component<
  SandboxErrorBoundaryProps,
  SandboxErrorBoundaryState
> {
  state: SandboxErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): SandboxErrorBoundaryState {
    if (error instanceof NetlabError && error.code === 'sandbox/tutorial-conflict') {
      return { error };
    }
    throw error;
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    if (!(error instanceof NetlabError) || error.code !== 'sandbox/tutorial-conflict') {
      throw error;
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section
        role="alert"
        style={{
          padding: 16,
          border: '1px solid var(--netlab-accent-orange, orange)',
          background: 'var(--netlab-bg-primary)',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
        }}
      >
        <strong>Sandbox is unavailable during tutorials.</strong>
        <p style={{ marginBottom: 0 }}>
          Use either guided tutorial mode or the free-form sandbox. See
          docs/ui/sandbox.md#tutorial-conflict.
        </p>
      </section>
    );
  }
}

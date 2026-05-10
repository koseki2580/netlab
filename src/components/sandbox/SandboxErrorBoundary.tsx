import { Component, type ErrorInfo, type ReactNode } from 'react';
import { NetlabError } from '../../errors';
import { I18nContext } from '../../i18n';

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
      <I18nContext.Consumer>
        {({ t }) => (
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
            <strong>{t('sandbox.edits.errorBoundary.heading')}</strong>
            <p style={{ marginBottom: 0 }}>{t('sandbox.edits.errorBoundary.body')}</p>
          </section>
        )}
      </I18nContext.Consumer>
    );
  }
}

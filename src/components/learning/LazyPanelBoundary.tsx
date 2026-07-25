import { Component, type ErrorInfo, type ReactNode } from 'react';
import { I18nContext } from '../../i18n';
import { pillButton } from './drillKit';

export interface LazyPanelBoundaryProps {
  readonly children: ReactNode;
  /** Bumped by the retry button so the parent can re-create its `lazy()`. */
  readonly onRetry: () => void;
}

interface LazyPanelBoundaryState {
  readonly failed: boolean;
}

/**
 * Catches a failed lazy-chunk import so one panel cannot blank the consumer's
 * whole app — this is a public package export, and a chunk 404 (page left open
 * across a deploy, dropped connection) would otherwise propagate out of netlab.
 *
 * Retry re-mounts *and* asks the parent for a fresh `lazy()`: React caches a
 * rejected lazy permanently, so resetting the boundary alone would re-throw.
 */
export class LazyPanelBoundary extends Component<LazyPanelBoundaryProps, LazyPanelBoundaryState> {
  state: LazyPanelBoundaryState = { failed: false };

  static getDerivedStateFromError(): LazyPanelBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Swallowed deliberately: the fallback below is the user-facing report.
  }

  private handleRetry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <I18nContext.Consumer>
        {({ t }) => (
          <section
            role="alert"
            style={{
              padding: 16,
              border: '1px solid var(--netlab-accent-orange, orange)',
              borderRadius: 8,
              background: 'var(--netlab-bg-primary)',
              color: 'var(--netlab-text-primary)',
            }}
          >
            <strong>{t('learning.drill.loadError.heading')}</strong>
            <p style={{ margin: '8px 0 12px' }}>{t('learning.drill.loadError.body')}</p>
            <button
              type="button"
              onClick={this.handleRetry}
              style={pillButton('var(--netlab-accent-orange, orange)')}
            >
              {t('learning.drill.loadError.retry')}
            </button>
          </section>
        )}
      </I18nContext.Consumer>
    );
  }
}

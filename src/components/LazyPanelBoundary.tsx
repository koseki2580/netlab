import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface LazyPanelBoundaryProps {
  readonly children: ReactNode;
  /** Bumped by the retry button so the parent can re-create its `lazy()`. */
  readonly onRetry: () => void;
  /**
   * Fallback copy. Supplied by the caller rather than translated here: the
   * boundary is shared by surfaces with different vocabularies (and different
   * i18n status), and its whole job is to render when the chunk carrying that
   * surface — and possibly its strings — failed to load.
   */
  readonly heading: ReactNode;
  readonly body: ReactNode;
  readonly retryLabel: ReactNode;
}

interface LazyPanelBoundaryState {
  readonly failed: boolean;
}

/**
 * Catches a failed lazy-chunk import so one panel cannot blank the consumer's
 * whole app — these are public package exports, and a chunk 404 (page left open
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
        <strong>{this.props.heading}</strong>
        <p style={{ margin: '8px 0 12px' }}>{this.props.body}</p>
        <button
          type="button"
          onClick={this.handleRetry}
          style={{
            border: '1px solid var(--netlab-accent-orange, orange)',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--netlab-accent-orange, orange)',
            padding: '4px 14px',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          {this.props.retryLabel}
        </button>
      </section>
    );
  }
}

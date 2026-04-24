import { useState } from 'react';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { LinkState } from '../../../sandbox/edits';
import { buttonStyle, sectionStyle } from './editorStyles';

export function LinkEditorForm({
  edgeId,
  onSubmitted,
}: {
  readonly edgeId: string;
  readonly onSubmitted?: () => void;
}) {
  const sandbox = useSandbox();
  const edge = sandbox.engine.whatIf
    .getTopology()
    .edges.find((candidate) => candidate.id === edgeId);
  const before: LinkState = edge?.data?.state === 'down' ? 'down' : 'up';
  const [after, setAfter] = useState<LinkState>(before === 'up' ? 'down' : 'up');

  if (!edge) {
    return <p style={{ color: 'var(--netlab-text-muted)' }}>Link not found.</p>;
  }

  return (
    <section style={sectionStyle} aria-label="Link editor">
      <strong>Link state</strong>
      <div role="group" aria-label="Target link state" style={{ display: 'flex', gap: 6 }}>
        {(['up', 'down'] as const).map((state) => (
          <button
            key={state}
            type="button"
            aria-pressed={after === state}
            style={{
              ...buttonStyle,
              borderColor: after === state ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)',
            }}
            onClick={() => setAfter(state)}
          >
            {state === 'up' ? 'Up' : 'Down'}
          </button>
        ))}
      </div>
      <span style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
        {after === 'down'
          ? 'Future forwarding treats this edge as unavailable.'
          : 'Future forwarding can use this edge.'}
      </span>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => {
          sandbox.setDiffFilter('link');
          sandbox.pushEdit({
            kind: 'link.state',
            target: { kind: 'edge', edgeId },
            before,
            after,
          });
          onSubmitted?.();
        }}
      >
        Apply link state
      </button>
    </section>
  );
}

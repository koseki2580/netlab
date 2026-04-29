import { useSandboxOrNull } from '../../../sandbox/useSandbox';
import { TraceAnnotationCallout } from './TraceAnnotationCallout';

export interface TraceAnnotationAnchorProps {
  readonly traceEventId: string;
}

export function TraceAnnotationAnchor({ traceEventId }: TraceAnnotationAnchorProps) {
  const sandbox = useSandboxOrNull();
  const annotations = sandbox?.engine.snapshot.annotations ?? [];
  const matching = annotations.filter((annotation) => annotation.traceEventId === traceEventId);

  if (matching.length === 0) return null;

  const first = matching[0];
  if (!first) return null;

  return (
    <span style={{ display: 'inline-flex', marginLeft: 4, verticalAlign: 'middle' }}>
      <TraceAnnotationCallout
        annotation={first}
        count={matching.length > 10 ? matching.length : 1}
      />
    </span>
  );
}

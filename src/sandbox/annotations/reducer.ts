import type { SimulationSnapshot } from '../types';
import type { TraceAnnotation, TraceAnnotationEdit } from './types';

type AnnotationSnapshot = SimulationSnapshot & {
  readonly annotations: readonly TraceAnnotation[];
};

function withAnnotations(
  snapshot: AnnotationSnapshot,
  annotations: readonly TraceAnnotation[],
): SimulationSnapshot {
  return {
    ...snapshot,
    annotations,
  } as SimulationSnapshot;
}

export function reduceAnnotation(
  snapshot: SimulationSnapshot,
  edit: TraceAnnotationEdit,
): SimulationSnapshot {
  if (typeof edit !== 'object' || edit === null || !('kind' in edit)) {
    return snapshot;
  }

  const annotationSnapshot = snapshot as AnnotationSnapshot;

  switch (edit.kind) {
    case 'trace.annotate.add':
      if (
        annotationSnapshot.annotations.some((annotation) => annotation.id === edit.annotation.id)
      ) {
        return snapshot;
      }
      return withAnnotations(annotationSnapshot, [
        ...annotationSnapshot.annotations,
        edit.annotation,
      ]);
    case 'trace.annotate.edit': {
      const target = annotationSnapshot.annotations.find((annotation) => annotation.id === edit.id);
      if (!target || target.author === 'scenario') return snapshot;

      return withAnnotations(
        annotationSnapshot,
        annotationSnapshot.annotations.map((annotation) =>
          annotation.id === edit.id ? { ...annotation, content: edit.after } : annotation,
        ),
      );
    }
    case 'trace.annotate.remove': {
      const target = annotationSnapshot.annotations.find((annotation) => annotation.id === edit.id);
      if (!target || target.author === 'scenario') return snapshot;

      return withAnnotations(
        annotationSnapshot,
        annotationSnapshot.annotations.filter((annotation) => annotation.id !== edit.id),
      );
    }
    default:
      return snapshot;
  }
}

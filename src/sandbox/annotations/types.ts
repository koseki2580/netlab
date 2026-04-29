export type AnnotationAuthor = 'user' | 'scenario';

export interface TraceAnnotation {
  readonly id: string;
  readonly traceEventId: string;
  readonly author: AnnotationAuthor;
  readonly content: string;
  readonly createdAt: number;
  readonly color?: string;
}

export type TraceAnnotationEdit =
  | { readonly kind: 'trace.annotate.add'; readonly annotation: TraceAnnotation }
  | {
      readonly kind: 'trace.annotate.edit';
      readonly id: string;
      readonly before: string;
      readonly after: string;
    }
  | {
      readonly kind: 'trace.annotate.remove';
      readonly id: string;
      readonly before: TraceAnnotation;
    };

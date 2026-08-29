import type { CSSProperties } from 'react';
import type { ValidationResult } from '../utils/connectionValidator';

export interface ValidationEdgeData extends Record<string, unknown> {
  validationResult?: ValidationResult;
}

export interface ValidationEdgeLabelProps {
  validationResult?: ValidationResult;
  labelX: number;
  labelY: number;
}

const LABEL_STYLE: CSSProperties = {
  position: 'absolute',
  display: 'grid',
  placeItems: 'center',
  width: 18,
  height: 18,
  borderRadius: '999px',
  border: '1px solid var(--netlab-border, rgba(100, 116, 139, 0.4))',
  background:
    'var(--netlab-bg-panel, color-mix(in srgb, var(--netlab-bg-primary) 95%, transparent))',
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.35)',
  color: 'var(--netlab-text-primary, #e2e8f0)',
  fontSize: 11,
  lineHeight: 1,
  pointerEvents: 'all',
  zIndex: 5,
};

export function getValidationMessages(validationResult?: ValidationResult): string[] {
  if (!validationResult) {
    return [];
  }

  return [
    ...validationResult.errors.map((error) => `Error: ${error.message}`),
    ...validationResult.warnings.map((warning) => `Warning: ${warning.message}`),
  ];
}

export function ValidationEdgeLabel({
  validationResult,
  labelX,
  labelY,
}: ValidationEdgeLabelProps) {
  const messages = getValidationMessages(validationResult);

  if (messages.length === 0) {
    return null;
  }

  const hasErrors = (validationResult?.errors.length ?? 0) > 0;

  return (
    <div
      className="netlab-validation-tooltip nodrag nopan"
      style={{
        ...LABEL_STYLE,
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
      }}
      title={messages.join('\n')}
      aria-label={messages.join(', ')}
    >
      {hasErrors ? '❌' : '⚠️'}
    </div>
  );
}

/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ValidationEdgeLabel } from './ValidationEdgeLabel';
import type { ValidationResult } from '../utils/connectionValidator';

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
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

function makeValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    ...overrides,
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }
});

describe('ValidationEdgeLabel', () => {
  it('renders nothing when validationResult is undefined', () => {
    render(<ValidationEdgeLabel labelX={10} labelY={20} />);

    expect(container?.querySelector('.netlab-validation-tooltip')).toBeNull();
  });

  it('renders nothing when there are no errors or warnings', () => {
    render(
      <ValidationEdgeLabel
        validationResult={makeValidationResult()}
        labelX={10}
        labelY={20}
      />,
    );

    expect(container?.querySelector('.netlab-validation-tooltip')).toBeNull();
  });

  it('renders an error icon and title for blocking validation errors', () => {
    render(
      <ValidationEdgeLabel
        validationResult={makeValidationResult({
          valid: false,
          errors: [
            {
              code: 'duplicate-edge',
              message: 'Duplicate edge: nodes are already connected',
            },
          ],
        })}
        labelX={10}
        labelY={20}
      />,
    );

    const label = container?.querySelector('.netlab-validation-tooltip');
    expect(label?.textContent).toBe('❌');
    expect(label?.getAttribute('title')).toBe(
      'Error: Duplicate edge: nodes are already connected',
    );
  });

  it('renders a warning icon and combined title for warning-only results', () => {
    render(
      <ValidationEdgeLabel
        validationResult={makeValidationResult({
          warnings: [
            {
              code: 'missing-ip',
              message: 'Missing IP configuration on router-1',
            },
            {
              code: 'subnet-mismatch',
              message: 'Subnet mismatch: 10.0.0.1/24 and 10.0.1.2/24 are in different subnets',
            },
          ],
        })}
        labelX={10}
        labelY={20}
      />,
    );

    const label = container?.querySelector('.netlab-validation-tooltip');
    expect(label?.textContent).toBe('⚠️');
    expect(label?.getAttribute('title')).toBe(
      [
        'Warning: Missing IP configuration on router-1',
        'Warning: Subnet mismatch: 10.0.0.1/24 and 10.0.1.2/24 are in different subnets',
      ].join('\n'),
    );
  });
});

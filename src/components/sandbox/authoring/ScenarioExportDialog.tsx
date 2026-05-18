import { useContext, useMemo, useState } from 'react';
import { AssessmentContext } from '../../../assessments/AssessmentContext';
import {
  exportScenarioFromSnapshot,
  type ExportOptions,
} from '../../../scenarios/authoring/exporter';
import { validateScenarioExport } from '../../../scenarios/authoring/validator';
import { useSandbox } from '../../../sandbox/useSandbox';
import { currentSandboxScenarioId } from '../sessionScenario';
import { sessionIoButtonStyle, sessionIoPanelStyle } from '../sessionIoStyles';

export interface ScenarioExportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

function titleFromId(id: string): string {
  return id
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function firstPreviewLines(source: string): string {
  return source.split('\n').slice(0, 40).join('\n');
}

export function ScenarioExportDialog({ open, onClose }: ScenarioExportDialogProps) {
  const sandbox = useSandbox();
  const assessment = useContext(AssessmentContext);
  const initialScenarioId = `${currentSandboxScenarioId()}-export`;
  const [scenarioId, setScenarioId] = useState(initialScenarioId);
  const [title, setTitle] = useState(titleFromId(initialScenarioId));
  const [summary, setSummary] = useState('Exported from the sandbox.');
  const [includeAnnotations, setIncludeAnnotations] = useState(false);
  const [preseedStrategy, setPreseedStrategy] =
    useState<ExportOptions['preseedStrategy']>('as-initial');
  const [attachRubric, setAttachRubric] = useState(false);
  const [errors, setErrors] = useState<readonly string[]>([]);

  const rubricId = assessment?.rubric.id;
  const options: ExportOptions = useMemo(
    () => ({
      scenarioId,
      title,
      summary,
      includeAnnotations,
      preseedStrategy,
      ...(attachRubric && rubricId ? { attachRubricId: rubricId } : {}),
    }),
    [attachRubric, includeAnnotations, preseedStrategy, rubricId, scenarioId, summary, title],
  );
  const snapshot = preseedStrategy === 'as-delta' ? sandbox.engine.root : sandbox.engine.snapshot;

  const preview = useMemo(() => {
    const validation = validateScenarioExport(snapshot, options);
    if (!validation.valid) {
      return validation.errors.join('\n');
    }
    return firstPreviewLines(exportScenarioFromSnapshot(snapshot, sandbox.session, options).ts);
  }, [options, sandbox.session, snapshot]);

  if (!open) return null;

  const exportNow = (format: 'ts' | 'json') => {
    const validation = validateScenarioExport(snapshot, options);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const result = exportScenarioFromSnapshot(snapshot, sandbox.session, options);
    setErrors([]);
    if (format === 'ts') {
      downloadText(`${scenarioId}.ts`, result.ts, 'text/typescript');
      return;
    }
    downloadText(`${scenarioId}.netlabscenario.json`, result.json, 'application/json');
  };

  return (
    <section
      role="dialog"
      aria-label="Export scenario"
      data-testid="sandbox-export-scenario-dialog"
      style={{
        ...sessionIoPanelStyle,
        position: 'absolute',
        right: 12,
        top: 54,
        zIndex: 30,
        width: 360,
        maxWidth: 'calc(100vw - 24px)',
        boxShadow: '0 16px 32px rgba(2, 6, 23, 0.35)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13, flex: 1 }}>Export scenario</h3>
        <button
          type="button"
          aria-label="Close scenario export"
          onClick={onClose}
          className="netlab-focus-ring"
          style={sessionIoButtonStyle}
        >
          x
        </button>
      </header>

      <label style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
        Scenario id
        <input
          aria-label="Scenario id"
          data-testid="sandbox-export-scenario-id"
          value={scenarioId}
          onChange={(event) => setScenarioId(event.currentTarget.value)}
        />
      </label>
      <label style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
        Title
        <input
          aria-label="Scenario title"
          data-testid="sandbox-export-scenario-title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
      </label>
      <label style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
        Summary
        <textarea
          aria-label="Scenario summary"
          data-testid="sandbox-export-scenario-summary"
          value={summary}
          onChange={(event) => setSummary(event.currentTarget.value)}
          rows={2}
        />
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: '0 0 8px' }}>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input
            type="radio"
            aria-label="Export as initial topology"
            checked={preseedStrategy === 'as-initial'}
            onChange={() => setPreseedStrategy('as-initial')}
          />{' '}
          Freeze current state
        </label>
        <label style={{ display: 'block' }}>
          <input
            type="radio"
            aria-label="Export as preseed edit delta"
            data-testid="sandbox-export-scenario-preseed"
            checked={preseedStrategy === 'as-delta'}
            onChange={() => setPreseedStrategy('as-delta')}
          />{' '}
          Keep edits as preseed delta
        </label>
      </fieldset>

      <label style={{ display: 'block', marginBottom: 4 }}>
        <input
          type="checkbox"
          aria-label="Include annotations"
          checked={includeAnnotations}
          onChange={(event) => setIncludeAnnotations(event.currentTarget.checked)}
        />{' '}
        Include annotations
      </label>
      {assessment ? (
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="checkbox"
            aria-label="Attach assessment rubric"
            checked={attachRubric}
            onChange={(event) => setAttachRubric(event.currentTarget.checked)}
          />{' '}
          Attach assessment rubric
        </label>
      ) : null}

      {errors.length > 0 ? (
        <ul aria-label="Scenario export errors" style={{ margin: '0 0 8px', paddingLeft: 18 }}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      <pre
        aria-label="Scenario TypeScript preview"
        data-testid="sandbox-export-scenario-preview"
        style={{
          margin: '8px 0',
          maxHeight: 220,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          background: 'var(--netlab-bg-primary)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 6,
          padding: 8,
        }}
      >
        {preview}
      </pre>

      <footer style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          aria-label="Download scenario TypeScript"
          data-testid="sandbox-export-scenario-download"
          onClick={() => exportNow('ts')}
          className="netlab-focus-ring"
          style={sessionIoButtonStyle}
        >
          Save TS
        </button>
        <button
          type="button"
          aria-label="Download scenario JSON"
          onClick={() => exportNow('json')}
          className="netlab-focus-ring"
          style={sessionIoButtonStyle}
        >
          Save JSON
        </button>
      </footer>
    </section>
  );
}

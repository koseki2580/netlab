import { useState } from 'react';
import { useOptionalProgress } from '../../progress';

export function ProgressPanel() {
  const progress = useOptionalProgress();
  const [exportedJson, setExportedJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmLearnerId, setConfirmLearnerId] = useState('');

  if (!progress.enabled) {
    return (
      <section aria-label="Learner progress">
        <h2>Learner progress</h2>
        <p>Progress persistence is disabled.</p>
      </section>
    );
  }

  const completions = progress.progress?.completions ?? [];

  return (
    <section
      aria-label="Learner progress"
      data-testid="gallery-progress-section"
      style={{
        border: '1px solid var(--netlab-border)',
        borderRadius: 8,
        padding: 16,
        background: 'color-mix(in srgb, var(--netlab-bg-surface) 88%, var(--netlab-bg-primary))',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>Learner progress</h2>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--netlab-text-secondary)' }}>
            {progress.learnerId}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            data-testid="gallery-progress-export"
            onClick={() => setExportedJson(progress.exportJson())}
          >
            Export JSON
          </button>
          <button
            type="button"
            data-testid="gallery-progress-clear"
            onClick={() => setConfirmingClear(true)}
          >
            Clear progress
          </button>
        </div>
      </div>

      {completions.length > 0 ? (
        <table style={{ width: '100%', marginTop: 14, borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ textAlign: 'left' }}>Kind</th>
              <th style={{ textAlign: 'left' }}>Score</th>
              <th style={{ textAlign: 'left' }}>Completed</th>
            </tr>
          </thead>
          <tbody>
            {completions.map((completion) => (
              <tr key={`${completion.kind}:${completion.id}`}>
                <td>{completion.label ?? completion.id}</td>
                <td>{completion.kind}</td>
                <td>
                  {completion.score
                    ? `${completion.score.passed}/${completion.score.total}`
                    : 'Complete'}
                </td>
                <td>{completion.completedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ marginTop: 14 }}>No completed items yet.</p>
      )}

      {exportedJson ? (
        <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          <span>Exported progress JSON</span>
          <textarea
            aria-label="Exported progress JSON"
            data-testid="gallery-progress-export-json"
            readOnly
            value={exportedJson}
            rows={5}
            style={{ fontFamily: 'monospace' }}
          />
        </label>
      ) : null}

      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Import progress JSON</span>
          <textarea
            aria-label="Import progress JSON"
            data-testid="gallery-progress-import-json"
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
            rows={4}
            style={{ fontFamily: 'monospace' }}
          />
        </label>
        <div>
          <button
            type="button"
            data-testid="gallery-progress-import"
            onClick={() => {
              const result = progress.importJson(importJson);
              setImportStatus(result.ok ? 'Imported' : `Import failed: ${result.reason}`);
            }}
          >
            Import JSON
          </button>
          {importStatus ? <span style={{ marginLeft: 8 }}>{importStatus}</span> : null}
        </div>
      </div>

      {confirmingClear ? (
        <div
          role="dialog"
          aria-label="Confirm clear progress"
          style={{
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            padding: 12,
            marginTop: 14,
          }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Confirm learner id</span>
            <input
              aria-label="Confirm learner id"
              data-testid="gallery-progress-confirm-id"
              value={confirmLearnerId}
              onChange={(event) => setConfirmLearnerId(event.target.value)}
            />
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              data-testid="gallery-progress-confirm-clear"
              disabled={confirmLearnerId !== progress.learnerId}
              onClick={() => {
                progress.clear();
                setConfirmingClear(false);
                setConfirmLearnerId('');
              }}
            >
              Confirm clear
            </button>
            <button type="button" onClick={() => setConfirmingClear(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

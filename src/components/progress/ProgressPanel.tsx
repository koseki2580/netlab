import { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useOptionalProgress } from '../../progress';

export function ProgressPanel() {
  const { t } = useI18n();
  const progress = useOptionalProgress();
  const [exportedJson, setExportedJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmLearnerId, setConfirmLearnerId] = useState('');

  if (!progress.enabled) {
    return (
      <section aria-label={t('learning.progress.panel.heading')}>
        <h2>{t('learning.progress.panel.heading')}</h2>
        <p>{t('learning.progress.panel.disabled')}</p>
      </section>
    );
  }

  const completions = progress.progress?.completions ?? [];

  return (
    <section
      aria-label={t('learning.progress.panel.heading')}
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
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('learning.progress.panel.heading')}</h2>
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
              <th style={{ textAlign: 'left' }}>{t('learning.progress.panel.column.item')}</th>
              <th style={{ textAlign: 'left' }}>{t('learning.progress.panel.column.kind')}</th>
              <th style={{ textAlign: 'left' }}>{t('learning.progress.panel.column.score')}</th>
              <th style={{ textAlign: 'left' }}>{t('learning.progress.panel.completed')}</th>
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
        <p style={{ marginTop: 14 }}>{t('learning.progress.panel.none')}</p>
      )}

      {exportedJson ? (
        <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          <span>{t('learning.progress.panel.export')}</span>
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
          <span>{t('learning.progress.panel.import')}</span>
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
            <span>{t('learning.progress.panel.confirmLearnerId')}</span>
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
                // Drop any earlier export too: leaving a JSON blob on screen
                // that lists completions the learner just deleted says their
                // progress is still here.
                setExportedJson('');
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

import { useEffect, useState } from 'react';
import { shortcutRegistry } from '../../../sandbox/shortcuts/registry';
import { SNAPSHOT_NAME_MAX_LENGTH } from '../../../sandbox/snapshots/types';
import { useSandbox } from '../../../sandbox/useSandbox';
import { renderMarkdown } from '../../../sandbox/annotations/markdown';

function newSnapshotId(): string {
  return crypto.randomUUID?.() ?? `snapshot-${Date.now()}`;
}

export function SaveSnapshotButton() {
  const sandbox = useSandbox();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const currentSnapshot = sandbox.engine.snapshot;
  const duplicate = (currentSnapshot?.snapshotRegistry ?? []).some(
    (entry) => entry.name === trimmed,
  );
  const invalid =
    trimmed.length === 0 ||
    trimmed.length > SNAPSHOT_NAME_MAX_LENGTH ||
    trimmed.startsWith('__') ||
    duplicate;

  useEffect(() => {
    const unregister = shortcutRegistry.register({
      key: 'Cmd+B',
      description: 'Save named snapshot',
      action: () => setOpen(true),
    });
    return unregister;
  }, []);

  const save = () => {
    if (invalid) return;
    sandbox.pushEdit({
      kind: 'snapshot.create',
      snapshot: {
        id: newSnapshotId(),
        name: trimmed,
        editIndex: sandbox.session.head,
        sessionIdAtCapture: 'default-session',
        createdAt: currentSnapshot?.capturedAt ?? sandbox.engine.whatIf.getState().currentStep,
      },
    });
    setName('');
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Save snapshot"
        onClick={() => setOpen(true)}
        className="netlab-focus-ring"
        style={{
          border: '1px solid var(--netlab-border)',
          borderRadius: 6,
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-primary)',
          padding: '3px 7px',
          fontFamily: 'monospace',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Save
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Save snapshot"
          style={{
            position: 'absolute',
            right: 12,
            top: 48,
            zIndex: 30,
            width: 260,
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            background: 'var(--netlab-bg-primary)',
            color: 'var(--netlab-text-primary)',
            padding: 12,
            boxShadow: '0 12px 32px rgba(2, 6, 23, 0.35)',
          }}
        >
          <label style={{ display: 'block', fontSize: 11 }}>
            Name
            <input
              value={name}
              maxLength={SNAPSHOT_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.currentTarget.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
            />
          </label>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--netlab-text-muted)' }}>
            Preview: {trimmed ? renderMarkdown(trimmed) : 'Unnamed'}
          </div>
          {duplicate ? (
            <p style={{ margin: '6px 0 0', fontSize: 11 }}>Name already exists</p>
          ) : null}
          {trimmed.startsWith('__') ? (
            <p style={{ margin: '6px 0 0', fontSize: 11 }}>Names starting with __ are reserved</p>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" disabled={invalid} onClick={save}>
              Save
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

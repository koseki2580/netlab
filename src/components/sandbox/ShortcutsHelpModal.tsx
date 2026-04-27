import { useEffect, useRef, type KeyboardEvent } from 'react';
import { shortcutRegistry, type ShortcutEntry } from '../../sandbox/shortcuts/registry';

interface Props {
  readonly onClose: () => void;
}

function ShortcutRow({ entry }: { readonly entry: ShortcutEntry }) {
  return (
    <tr>
      <td
        style={{
          padding: '4px 8px',
          fontFamily: 'monospace',
          fontSize: 12,
          whiteSpace: 'nowrap',
          color: 'var(--netlab-accent-cyan)',
          borderBottom: '1px solid var(--netlab-border)',
        }}
      >
        {entry.key}
      </td>
      <td
        style={{
          padding: '4px 8px',
          fontSize: 12,
          color: 'var(--netlab-text-primary)',
          borderBottom: '1px solid var(--netlab-border)',
        }}
      >
        {entry.description}
      </td>
    </tr>
  );
}

export function ShortcutsHelpModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previous?.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
    if (event.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const entries = shortcutRegistry.list();

  return (
    <div
      role="none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-heading"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--netlab-bg-primary)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 8,
          padding: '20px 24px',
          minWidth: 340,
          maxHeight: '80vh',
          overflowY: 'auto',
          outline: 'none',
          boxShadow: '0 16px 40px rgba(2, 6, 23, 0.55)',
          fontFamily: 'monospace',
          color: 'var(--netlab-text-primary)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 id="shortcuts-modal-heading" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            aria-label="Close shortcuts help"
            onClick={onClose}
            className="netlab-focus-ring"
            style={{
              border: '1px solid var(--netlab-border)',
              borderRadius: 6,
              background: 'var(--netlab-bg-surface)',
              color: 'var(--netlab-text-muted)',
              padding: '3px 7px',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            x
          </button>
        </div>
        <table
          style={{ borderCollapse: 'collapse', width: '100%' }}
          aria-label="Keyboard shortcuts list"
        >
          <thead>
            <tr>
              <th
                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '2px 8px 6px',
                  fontSize: 11,
                  color: 'var(--netlab-text-muted)',
                  borderBottom: '1px solid var(--netlab-border)',
                }}
              >
                Key
              </th>
              <th
                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '2px 8px 6px',
                  fontSize: 11,
                  color: 'var(--netlab-text-muted)',
                  borderBottom: '1px solid var(--netlab-border)',
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <ShortcutRow key={entry.key} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

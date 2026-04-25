import { useRef, useState } from 'react';
import { hookEngine } from '../../hooks/HookEngine';
import type { DecodedExportedSession } from '../../sandbox/session-io/schema';
import { useSandbox } from '../../sandbox/useSandbox';
import { ImportPreview } from './ImportPreview';
import { sessionIoButtonStyle, sessionIoPanelStyle } from './sessionIoStyles';

export function ImportDialog() {
  const sandbox = useSandbox();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [decoded, setDecoded] = useState<DecodedExportedSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const { parseSessionJson } = await import('../../sandbox/session-io/codec');
      const next = parseSessionJson(text);
      setDecoded(next);
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setDecoded(null);
      setError(message);
    }
  };

  const applyImport = () => {
    if (!decoded) return;

    sandbox.setSession(decoded.session);
    void hookEngine.emit('sandbox:session-imported', {
      scenarioId: decoded.exported.scenarioId,
      editCount: decoded.session.backing.length,
      head: decoded.session.head,
    });
    setDecoded(null);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Import sandbox session"
        onClick={() => inputRef.current?.click()}
        className="netlab-focus-ring"
        style={sessionIoButtonStyle}
      >
        Import
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label="Import sandbox session file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.currentTarget.value = '';
        }}
        style={{ display: 'none' }}
      />
      {decoded ? (
        <ImportPreview decoded={decoded} onApply={applyImport} onCancel={() => setDecoded(null)} />
      ) : null}
      {error ? (
        <section aria-label="Sandbox session import error" style={sessionIoPanelStyle}>
          {error}
        </section>
      ) : null}
    </>
  );
}

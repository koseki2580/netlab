import { useContext, useRef, useState } from 'react';
import { hookEngine as sharedHookEngine } from '../../hooks/HookEngine';
import { useI18n } from '../../i18n';
import type { DecodedExportedSession } from '../../sandbox/session-io/schema';
import { useSandbox } from '../../sandbox/useSandbox';
import { NetlabContext } from '../NetlabContext';
import { ImportPreview } from './ImportPreview';
import { sessionIoButtonStyle, sessionIoPanelStyle } from './sessionIoStyles';

export function ImportDialog() {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const netlabContext = useContext(NetlabContext);
  const hookEngine = netlabContext?.hookEngine ?? sharedHookEngine;
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
        aria-label={t('sandbox.edits.import.dialog.label')}
        onClick={() => inputRef.current?.click()}
        className="netlab-focus-ring"
        style={sessionIoButtonStyle}
      >
        {t('sandbox.edits.import.dialog.heading')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label={t('sandbox.edits.import.file.label')}
        data-testid="sandbox-import-session-input"
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
        <section aria-label={t('sandbox.edits.import.error.label')} style={sessionIoPanelStyle}>
          {error}
        </section>
      ) : null}
    </>
  );
}

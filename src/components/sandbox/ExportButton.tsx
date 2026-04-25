import { useSandbox } from '../../sandbox/useSandbox';
import { currentSandboxScenarioId } from './sessionScenario';
import { sessionIoButtonStyle } from './sessionIoStyles';

function timestampForFilename(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
}

export function ExportButton() {
  const sandbox = useSandbox();

  const handleExport = async () => {
    const { encodeSession } = await import('../../sandbox/session-io/codec');
    const scenarioId = currentSandboxScenarioId();
    const exported = encodeSession(sandbox.session, {
      scenarioId,
      initialParameters: sandbox.engine.parameters,
    });
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netlab-sandbox-${scenarioId}-${timestampForFilename()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      aria-label="Export sandbox session"
      onClick={() => {
        void handleExport();
      }}
      className="netlab-focus-ring"
      style={sessionIoButtonStyle}
    >
      Export
    </button>
  );
}

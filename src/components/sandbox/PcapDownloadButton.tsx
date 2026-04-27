import { useState } from 'react';
import { hookEngine } from '../../hooks/HookEngine';
import type { PcapBranch } from '../../sandbox/pcap/exportSandboxPcap';
import { exportSandboxPcap } from '../../sandbox/pcap/exportSandboxPcap';
import { useSandbox } from '../../sandbox/useSandbox';
import { sessionIoButtonStyle } from './sessionIoStyles';
import { currentSandboxScenarioId } from './sessionScenario';

const BETA_OPTIONS: { value: PcapBranch; label: string }[] = [
  { value: 'whatif', label: 'What-if' },
  { value: 'baseline', label: 'Baseline' },
  { value: 'combined', label: 'Combined' },
];

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function PcapDownloadButton({ forceBranch }: { readonly forceBranch?: PcapBranch }) {
  const sandbox = useSandbox();
  const isAlpha = sandbox.mode === 'alpha';
  const [betaBranch, setBetaBranch] = useState<PcapBranch>('whatif');

  const activeBranch: PcapBranch = forceBranch ?? (isAlpha ? 'alpha' : betaBranch);

  const handleDownload = () => {
    const scenarioId = currentSandboxScenarioId();
    const results = exportSandboxPcap(sandbox.engine, activeBranch, { scenarioId });
    let totalBytes = 0;
    for (const { blob, filename } of results) {
      triggerDownload(blob, filename);
      totalBytes += blob.size;
    }
    void hookEngine.emit('sandbox:pcap-exported', { branch: activeBranch, bytes: totalBytes });
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {!isAlpha && !forceBranch && (
        <select
          aria-label="PCAP branch selection"
          value={betaBranch}
          onChange={(e) => setBetaBranch(e.target.value as PcapBranch)}
          style={{
            ...sessionIoButtonStyle,
            padding: '3px 4px',
            cursor: 'pointer',
          }}
        >
          {BETA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        aria-label={`Download sandbox PCAP${forceBranch ? ` (${forceBranch})` : ''}`}
        onClick={handleDownload}
        className="netlab-focus-ring"
        style={sessionIoButtonStyle}
      >
        PCAP
      </button>
    </div>
  );
}

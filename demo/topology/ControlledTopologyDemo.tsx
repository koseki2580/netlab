import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { SimulationProvider } from '../../src/simulation/SimulationContext';
import { useSandbox } from '../../src/sandbox/useSandbox';
import type { SandboxEditProposal } from '../../src/controlled/sandbox-mode';
import type { Edit } from '../../src/sandbox/edits';
import type { NetworkTopology, TopologySnapshot } from '../../src/types/topology';
import { decodeTopology, encodeTopology } from '../../src/utils/topology-url';
import DemoShell from '../DemoShell';
import { readLearningLocale } from '../learning/learningLocale';
import { useT } from '../localeContext';
import { STEP_SIM_TOPOLOGY } from '../simulation/stepSimShared';

const INITIAL_TOPOLOGY: NetworkTopology = {
  nodes: STEP_SIM_TOPOLOGY.nodes,
  edges: STEP_SIM_TOPOLOGY.edges,
  areas: STEP_SIM_TOPOLOGY.areas,
  routeTables: new Map(),
};

export const CONTROLLED_TOPOLOGY_INITIAL_TOPOLOGY = INITIAL_TOPOLOGY;

const LINK_DOWN_EDIT: Edit = {
  kind: 'link.state',
  target: { kind: 'edge', edgeId: 'e1' },
  before: 'up',
  after: 'down',
};

const LINK_UP_EDIT: Edit = {
  kind: 'link.state',
  target: { kind: 'edge', edgeId: 'e1' },
  before: 'down',
  after: 'up',
};

function formatSnapshot(snapshot: TopologySnapshot): string {
  return JSON.stringify(
    {
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      snapshot,
    },
    null,
    2,
  );
}

function ControlledSandboxHarness() {
  const t = useT();
  const sandbox = useSandbox();

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 12,
        display: 'flex',
        gap: 8,
      }}
    >
      <button
        type="button"
        data-testid="controlled-sandbox-propose-down"
        onClick={() => sandbox.pushEdit(LINK_DOWN_EDIT)}
        style={{
          border: '1px solid var(--netlab-accent-blue)',
          borderRadius: 8,
          padding: '8px 10px',
          background: '#1d4ed8',
          color: '#eff6ff',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        {t('Propose link down', 'リンクの切断を提案')}
      </button>
      <button
        type="button"
        data-testid="controlled-sandbox-propose-up"
        onClick={() => sandbox.pushEdit(LINK_UP_EDIT)}
        style={{
          border: '1px solid var(--netlab-border)',
          borderRadius: 8,
          padding: '8px 10px',
          background: 'var(--netlab-bg-primary)',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        {t('Propose link up', 'リンクの復旧を提案')}
      </button>
    </div>
  );
}

export function ControlledTopologyDemo() {
  const params = new URLSearchParams(window.location.search);
  const sandboxEnabled = params.get('sandbox') === '1';
  const showSandboxHarness = sandboxEnabled && params.get('controlledSandboxHarness') === '1';
  const [topology, setTopology] = useState<NetworkTopology>(INITIAL_TOPOLOGY);
  const [encodedSearch, setEncodedSearch] = useState(() => encodeTopology(INITIAL_TOPOLOGY));
  const [pendingProposal, setPendingProposal] = useState<SandboxEditProposal | null>(null);
  // This component renders <DemoShell> itself, so its words sit outside the
  // shell's language context; read the learner's choice the way the shell does.
  const [locale] = useState(readLearningLocale);
  const t = (en: string, ja: string) => (locale === 'ja' ? ja : en);
  const [status, setStatus] = useState(() =>
    t(
      'Drag nodes, connect links, or delete edges to update the snapshot.',
      '機器をドラッグしたり、リンクをつないだり消したりすると、スナップショットが更新されます。',
    ),
  );

  const snapshot: TopologySnapshot = {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  };

  const handleTopologyChange = (nextSnapshot: TopologySnapshot) => {
    setTopology((prev) => ({ ...prev, ...nextSnapshot }));
    setStatus(
      t(
        'Topology updated from canvas interaction.',
        'キャンバスでの操作でトポロジを更新しました。',
      ),
    );
  };

  const handleProviderTopologyChange = (
    nextSnapshot: TopologySnapshot,
    meta: { readonly source: 'user' | 'sandbox' | 'sandbox-informational' },
  ) => {
    if (meta.source !== 'sandbox-informational') {
      setTopology((prev) => ({ ...prev, ...nextSnapshot }));
    }
    setStatus(
      t(`Topology update source: ${meta.source}.`, `トポロジを更新した操作元: ${meta.source}`),
    );
  };

  const handleSandboxEditProposed = (proposal: SandboxEditProposal) => {
    setPendingProposal(proposal);
    setStatus(
      t(
        `Sandbox proposed ${proposal.edit.kind}.`,
        `サンドボックスが ${proposal.edit.kind} を提案しました。`,
      ),
    );
  };

  const acceptPendingProposal = () => {
    pendingProposal?.accept();
    setPendingProposal(null);
  };

  const rejectPendingProposal = () => {
    pendingProposal?.reject('demo-reject');
    setPendingProposal(null);
  };

  const handleEncode = () => {
    const nextSearch = encodeTopology(snapshot);
    setEncodedSearch(nextSearch);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${nextSearch}${window.location.hash}`,
    );
    setStatus(
      t(
        'Current topology encoded into window.location.search.',
        '今のトポロジを window.location.search に書き込みました。',
      ),
    );
  };

  const handleRestore = () => {
    const restored = decodeTopology(window.location.search);
    if (!restored) {
      setStatus(
        t(
          'No valid topology found in the current URL.',
          '今の URL には有効なトポロジが入っていません。',
        ),
      );
      return;
    }

    setTopology(restored);
    setEncodedSearch(window.location.search || encodeTopology(restored));
    setStatus(
      t('Topology restored from the current URL.', '今の URL からトポロジを復元しました。'),
    );
  };

  return (
    <DemoShell
      title="Controlled Topology"
      desc="Parent-owned topology state with live JSON and URL serialization"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          height: '100%',
          minHeight: 0,
          padding: 16,
          boxSizing: 'border-box',
          background: 'var(--netlab-bg-primary)',
        }}
      >
        <div
          style={{
            flex: '1 1 640px',
            minHeight: 420,
            border: '1px solid var(--netlab-bg-surface)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'var(--netlab-bg-primary)',
          }}
        >
          <NetlabProvider
            topology={topology}
            {...(sandboxEnabled
              ? {
                  sandboxEnabled: true,
                  sandboxControlMode: 'sandbox-proposes' as const,
                  onTopologyChange: handleProviderTopologyChange,
                  onSandboxEditProposed: handleSandboxEditProposed,
                }
              : {})}
          >
            {sandboxEnabled ? (
              <SimulationProvider>
                <NetlabCanvas onTopologyChange={handleTopologyChange} />
                {showSandboxHarness && <ControlledSandboxHarness />}
              </SimulationProvider>
            ) : (
              <NetlabCanvas onTopologyChange={handleTopologyChange} />
            )}
          </NetlabProvider>
        </div>

        <aside
          tabIndex={0}
          style={{
            flex: '0 1 380px',
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            // Scroll inside rather than growing the row: this column holds a
            // JSON snapshot and an encoded URL, both of which get long, and the
            // canvas beside it is stretched to whatever height they reach.
            minHeight: 0,
            overflowY: 'auto',
            gap: 12,
            padding: 16,
            border: '1px solid var(--netlab-bg-surface)',
            borderRadius: 12,
            background: 'var(--netlab-bg-primary)',
            color: '#e5e7eb',
            fontFamily: 'monospace',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 1,
                color: 'var(--netlab-accent-cyan)',
                marginBottom: 6,
              }}
            >
              {t('TOPOLOGY STATE (JSON)', 'トポロジの状態 (JSON)')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--netlab-text-secondary)', lineHeight: 1.5 }}>
              {status}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleEncode}
              style={{
                border: '1px solid var(--netlab-accent-blue)',
                borderRadius: 8,
                padding: '8px 12px',
                background: '#1d4ed8',
                color: '#eff6ff',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('Encode to URL', 'URL に書き込む')}
            </button>
            <button
              onClick={handleRestore}
              style={{
                border: '1px solid var(--netlab-border)',
                borderRadius: 8,
                padding: '8px 12px',
                background: 'var(--netlab-bg-primary)',
                color: 'var(--netlab-text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('Restore from URL', 'URL から復元')}
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--netlab-text-primary)', lineHeight: 1.6 }}>
            <div>
              {t('Nodes:', '機器:')} {snapshot.nodes.length}
            </div>
            <div>
              {t('Edges:', 'リンク:')} {snapshot.edges.length}
            </div>
            {showSandboxHarness && (
              <div data-testid="controlled-sandbox-pending">
                {t('Pending sandbox proposal:', '保留中のサンドボックスの提案:')}{' '}
                {pendingProposal ? pendingProposal.edit.kind : t('none', 'なし')}
              </div>
            )}
          </div>

          {showSandboxHarness && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                data-testid="controlled-sandbox-accept"
                disabled={!pendingProposal}
                onClick={acceptPendingProposal}
                style={{
                  border: '1px solid #16a34a',
                  borderRadius: 8,
                  padding: '8px 12px',
                  background: pendingProposal ? '#15803d' : '#1f2937',
                  color: '#f0fdf4',
                  cursor: pendingProposal ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {t('Accept proposal', '提案を受け入れる')}
              </button>
              <button
                type="button"
                data-testid="controlled-sandbox-reject"
                disabled={!pendingProposal}
                onClick={rejectPendingProposal}
                style={{
                  border: '1px solid #dc2626',
                  borderRadius: 8,
                  padding: '8px 12px',
                  background: pendingProposal
                    ? 'color-mix(in srgb, var(--netlab-accent-red) 30%, transparent)'
                    : '#1f2937',
                  color: '#fef2f2',
                  cursor: pendingProposal ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {t('Reject proposal', '提案を断る')}
              </button>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, color: 'var(--netlab-text-secondary)', marginBottom: 6 }}>
              {t('URL Query', 'URL クエリ')}
            </div>
            <pre
              // Focusable because it scrolls: a keyboard user has no other way
              // to reach the rest of an encoded topology this long.
              tabIndex={0}
              aria-label={t('Encoded topology URL query', 'トポロジを書き込んだ URL クエリ')}
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--netlab-bg-surface)',
                background: 'var(--netlab-bg-primary)',
                color: 'var(--netlab-accent-cyan)',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                // The encoded topology runs to thousands of characters. Left
                // unbounded it stretched this column, and the canvas beside it,
                // to 4476px — putting the whole network below the fold on the
                // demo that exists to show the canvas being driven.
                maxHeight: 160,
                overflow: 'auto',
              }}
            >
              {encodedSearch}
            </pre>
          </div>

          <pre
            data-testid="controlled-topology-json"
            tabIndex={0}
            aria-label={t('Topology snapshot JSON', 'トポロジのスナップショット (JSON)')}
            style={{
              margin: 0,
              flex: 1,
              minHeight: 0,
              // `flex: 1` only bounds this where the column itself is bounded,
              // and this column's height comes from its own content. Without a
              // ceiling the snapshot grew the column, the row and the canvas
              // beside it, until the network sat thousands of pixels down.
              maxHeight: 420,
              overflow: 'auto',
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--netlab-bg-surface)',
              background: 'var(--netlab-bg-primary)',
              color: 'var(--netlab-text-primary)',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {formatSnapshot(snapshot)}
          </pre>
        </aside>
      </div>
    </DemoShell>
  );
}

export default ControlledTopologyDemo;

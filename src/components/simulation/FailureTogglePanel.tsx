import { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useFailure } from '../../simulation/FailureContext';
import { useOptionalSimulation } from '../../simulation/SimulationContext';
import { useNetlabContext } from '../NetlabContext';

function ToggleRow({
  label,
  isDown,
  onToggle,
}: {
  label: string;
  isDown: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
        gap: 8,
      }}
    >
      <span
        style={{
          color: 'var(--netlab-text-primary)',
          fontSize: 12,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          color: isDown ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-green)',
          minWidth: 30,
          textAlign: 'right',
        }}
      >
        {isDown ? t('simulation.failure.down') : t('simulation.failure.up')}
      </span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={!isDown}
        aria-label={t('simulation.failure.toggleLabel', { label })}
        className="netlab-focus-ring"
        style={{
          fontSize: 10,
          padding: '2px 8px',
          background: isDown
            ? '#7f1d1d'
            : 'color-mix(in srgb, var(--netlab-accent-green) 18%, transparent)',
          color: isDown ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-green)',
          border: `1px solid ${isDown ? '#ef4444' : 'var(--netlab-accent-green)'}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}
      >
        {t('simulation.failure.toggle')}
      </button>
    </div>
  );
}

type FailureGroup = 'nodes' | 'links' | 'interfaces';

interface ToggleItem {
  readonly key: string;
  readonly label: string;
  readonly isDown: boolean;
  readonly onToggle: () => void;
}

// Five rows show at once; more scroll inside the list, which keeps its own
// always-visible scrollbar so a learner can see that there is more below.
const LIST_MAX_HEIGHT = 130;

const SCROLL_SHADOW_COLOR = 'color-mix(in srgb, var(--netlab-text-muted) 45%, transparent)';
const SCROLL_SHADOWS = [
  'linear-gradient(var(--netlab-bg-primary) 30%, transparent) top / 100% 24px no-repeat local',
  'linear-gradient(transparent, var(--netlab-bg-primary) 70%) bottom / 100% 24px no-repeat local',
  `radial-gradient(farthest-side at 50% 0, ${SCROLL_SHADOW_COLOR}, transparent) top / 100% 10px no-repeat scroll`,
  `radial-gradient(farthest-side at 50% 100%, ${SCROLL_SHADOW_COLOR}, transparent) bottom / 100% 10px no-repeat scroll`,
  'var(--netlab-bg-primary)',
].join(', ');

const GROUP_LABEL_KEYS: Record<FailureGroup, string> = {
  nodes: 'simulation.failure.nodes',
  links: 'simulation.failure.links',
  interfaces: 'simulation.failure.interfaces',
};

export function FailureTogglePanel() {
  const { t } = useI18n();
  const {
    toggleNode,
    toggleEdge,
    toggleInterface,
    resetFailures,
    isNodeDown,
    isEdgeDown,
    isInterfaceDown,
  } = useFailure();
  const { topology } = useNetlabContext();
  const simulation = useOptionalSimulation();
  const [group, setGroup] = useState<FailureGroup>('nodes');

  const visibleNodes = topology.nodes.filter((n) => n.type !== 'netlab-area');
  const routerNodes = visibleNodes.filter(
    (node) => Array.isArray(node.data.interfaces) && node.data.interfaces.length > 0,
  );

  const groups: Record<FailureGroup, ToggleItem[]> = {
    nodes: visibleNodes.map((node) => ({
      key: node.id,
      label: node.data.label,
      isDown: isNodeDown(node.id),
      onToggle: () => toggleNode(node.id),
    })),
    links: topology.edges.map((edge) => {
      const srcLabel = topology.nodes.find((n) => n.id === edge.source)?.data.label ?? edge.source;
      const dstLabel = topology.nodes.find((n) => n.id === edge.target)?.data.label ?? edge.target;
      return {
        key: edge.id,
        label: `${srcLabel} ↔ ${dstLabel}`,
        isDown: isEdgeDown(edge.id),
        onToggle: () => toggleEdge(edge.id),
      };
    }),
    interfaces: routerNodes.flatMap((node) =>
      (node.data.interfaces ?? []).map((iface) => ({
        key: `${node.id}:${iface.id}`,
        label: `${node.data.label} / ${iface.name}`,
        isDown: isInterfaceDown(node.id, iface.id),
        onToggle: () => toggleInterface(node.id, iface.id),
      })),
    ),
  };
  const groupOrder = (['nodes', 'links', 'interfaces'] as const).filter(
    (candidate) => groups[candidate].length > 0,
  );
  const activeGroup = groupOrder.includes(group) ? group : (groupOrder[0] ?? 'nodes');
  const items = groups[activeGroup];

  return (
    <div
      data-testid="failure-toggle-panel"
      style={{
        background: 'var(--netlab-bg-primary)',
        border: '1px solid var(--netlab-bg-surface)',
        borderRadius: 8,
        padding: '10px 12px',
        fontFamily: 'monospace',
        fontSize: 12,
        color: 'var(--netlab-text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxHeight: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            flex: 1,
            fontWeight: 'bold',
            fontSize: 11,
            color: 'var(--netlab-text-secondary)',
            letterSpacing: '0.08em',
          }}
        >
          {t('simulation.failure.heading')}
        </div>
        <button
          type="button"
          onClick={resetFailures}
          className="netlab-focus-ring"
          style={{
            padding: '2px 8px',
            background: 'var(--netlab-bg-surface)',
            color: 'var(--netlab-text-secondary)',
            border: '1px solid var(--netlab-border)',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          {t('simulation.failure.resetAll')}
        </button>
      </div>

      {simulation?.isRecomputing && (
        <div
          style={{
            padding: '6px 10px',
            background: '#172554',
            border: '1px solid #1e40af',
            borderRadius: 6,
            fontSize: 11,
            color: '#60a5fa',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#3b82f6',
              flexShrink: 0,
            }}
          />
          {t('simulation.failure.calculating')}
        </div>
      )}

      <div
        role="group"
        aria-label={t('simulation.failureGroups.label')}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
      >
        {groupOrder.map((candidate) => {
          const selected = candidate === activeGroup;
          const downCount = groups[candidate].filter((item) => item.isDown).length;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={selected}
              data-testid={`failure-group-${candidate}`}
              onClick={() => setGroup(candidate)}
              className="netlab-focus-ring"
              style={{
                padding: '2px 6px',
                borderRadius: 999,
                border: `1px solid ${selected ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}`,
                background: selected
                  ? 'color-mix(in srgb, var(--netlab-accent-cyan) 16%, transparent)'
                  : 'var(--netlab-bg-surface)',
                color: selected ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 10,
                whiteSpace: 'nowrap',
              }}
            >
              {t(GROUP_LABEL_KEYS[candidate])} {groups[candidate].length}
              {downCount > 0 ? (
                <span style={{ color: 'var(--netlab-accent-red)', marginLeft: 6 }}>
                  {t('simulation.failureGroups.downCount', { count: downCount })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        data-testid="failure-toggle-list"
        tabIndex={0}
        aria-label={t(GROUP_LABEL_KEYS[activeGroup])}
        className="netlab-focus-ring"
        style={{
          maxHeight: LIST_MAX_HEIGHT,
          minHeight: 0,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--netlab-text-muted) transparent',
          scrollbarGutter: 'stable',
          paddingRight: 4,
          // Scroll shadows: a soft edge appears at the top or bottom only while
          // there are more rows that way, even where scrollbars are hidden.
          background: SCROLL_SHADOWS,
        }}
      >
        {items.map((item) => (
          <ToggleRow
            key={item.key}
            label={item.label}
            isDown={item.isDown}
            onToggle={item.onToggle}
          />
        ))}
      </div>
    </div>
  );
}

import { useI18n } from '../../i18n/useI18n';
import type { NetlabNode } from '../../types/topology';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { EditorRunButton } from './EditorRunButton';
import {
  createRouterNode,
  createSwitchNode,
  createClientNode,
  createServerNode,
  randomPosition,
} from '../utils/nodeFactory';
import { nameNewNode } from '../utils/nodeNaming';

const TOOLBAR_STYLE: React.CSSProperties = {
  height: 44,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 12px',
  background: 'var(--netlab-bg-surface)',
  borderBottom: '1px solid var(--netlab-border)',
  fontFamily: 'monospace',
};

const SEPARATOR_STYLE: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'var(--netlab-border)',
  margin: '0 4px',
};

interface BtnProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function Btn({ onClick, disabled, children, title }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '4px 10px',
        background: 'var(--netlab-border)',
        color: disabled ? 'var(--netlab-text-muted)' : 'var(--netlab-text-primary)',
        border: 'none',
        borderRadius: 5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: 'monospace',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

export interface EditorToolbarProps {
  /** A device was placed (named and selected); the editor opens its editor. */
  onPlaced?: (node: NetlabNode) => void;
  /** Run finished; the editor opens the result. */
  onRan?: () => void;
}

export function EditorToolbar({ onPlaced, onRan }: EditorToolbarProps = {}) {
  const { t } = useI18n();
  const { state, addNode, setSelectedNodeId, undo, redo, canUndo, canRedo } =
    useTopologyEditorContext();
  // A new device gets a readable name and is selected, so its editor opens.
  const place = (created: NetlabNode) => {
    const node = nameNewNode(created, state.topology.nodes);
    addNode(node);
    setSelectedNodeId(node.id);
    onPlaced?.(node);
  };

  return (
    <div style={TOOLBAR_STYLE}>
      <span
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
          letterSpacing: 1,
          marginRight: 4,
        }}
      >
        {t('editor.toolbar.add')}
      </span>
      <Btn
        onClick={() => place(createRouterNode(randomPosition()))}
        title={t('editor.toolbar.addRouter')}
      >
        {t('editor.toolbar.router')}
      </Btn>
      <Btn
        onClick={() => place(createSwitchNode(randomPosition()))}
        title={t('editor.toolbar.addSwitch')}
      >
        {t('editor.toolbar.switch')}
      </Btn>
      <Btn
        onClick={() => place(createClientNode(randomPosition()))}
        title={t('editor.toolbar.addClient')}
      >
        {t('editor.toolbar.client')}
      </Btn>
      <Btn
        onClick={() => place(createServerNode(randomPosition()))}
        title={t('editor.toolbar.addServer')}
      >
        {t('editor.toolbar.server')}
      </Btn>

      <div style={SEPARATOR_STYLE} />

      <Btn onClick={undo} disabled={!canUndo} title={t('editor.toolbar.undoTitle')}>
        {t('editor.toolbar.undo')}
      </Btn>
      <Btn onClick={redo} disabled={!canRedo} title={t('editor.toolbar.redoTitle')}>
        {t('editor.toolbar.redo')}
      </Btn>

      <div style={SEPARATOR_STYLE} />

      <EditorRunButton {...(onRan ? { onRan } : {})} />
    </div>
  );
}

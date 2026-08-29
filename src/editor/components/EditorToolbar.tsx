import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { EditorRunButton } from './EditorRunButton';
import {
  createRouterNode,
  createSwitchNode,
  createClientNode,
  createServerNode,
  randomPosition,
} from '../utils/nodeFactory';

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

export function EditorToolbar() {
  const { addNode, undo, redo, canUndo, canRedo } = useTopologyEditorContext();

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
        ADD
      </span>
      <Btn onClick={() => addNode(createRouterNode(randomPosition()))} title="Add Router">
        + Router
      </Btn>
      <Btn onClick={() => addNode(createSwitchNode(randomPosition()))} title="Add Switch">
        + Switch
      </Btn>
      <Btn onClick={() => addNode(createClientNode(randomPosition()))} title="Add Client">
        + Client
      </Btn>
      <Btn onClick={() => addNode(createServerNode(randomPosition()))} title="Add Server">
        + Server
      </Btn>

      <div style={SEPARATOR_STYLE} />

      <Btn onClick={undo} disabled={!canUndo} title="Undo (last action)">
        ↩ Undo
      </Btn>
      <Btn onClick={redo} disabled={!canRedo} title="Redo">
        ↪ Redo
      </Btn>

      <div style={SEPARATOR_STYLE} />

      <EditorRunButton />
    </div>
  );
}

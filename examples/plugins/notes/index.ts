import { createElement, useState, type ChangeEvent } from 'react';
import type { PluginEdit, PluginEditSpec } from '../../../src/sandbox/plugin/types';
import { cloneSnapshot } from '../../../src/sandbox/SimulationSnapshot';

export interface NotesPluginEdit extends PluginEdit {
  readonly kind: 'plugin:example.notes';
  readonly target: {
    readonly kind: 'node';
    readonly nodeId: string;
  };
  readonly note: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isNotesPluginEdit(value: unknown): value is NotesPluginEdit {
  return (
    isRecord(value) &&
    value.kind === 'plugin:example.notes' &&
    isRecord(value.target) &&
    value.target.kind === 'node' &&
    typeof value.target.nodeId === 'string' &&
    typeof value.note === 'string'
  );
}

export function createNoteEdit(nodeId: string, note: string): NotesPluginEdit {
  return {
    kind: 'plugin:example.notes',
    target: { kind: 'node', nodeId },
    note,
  };
}

function NotesEditor({
  target,
  onCommit,
}: {
  readonly target: import('../../../src/sandbox/plugin/types').PluginEditorTarget;
  readonly onCommit: (edit: NotesPluginEdit) => void;
}) {
  const [note, setNote] = useState('');
  if (target.kind !== 'node') {
    return null;
  }

  return createElement(
    'section',
    {
      'aria-label': 'Notes plugin editor',
      style: {
        display: 'grid',
        gap: 6,
        paddingTop: 8,
        borderTop: '1px solid var(--netlab-border)',
      },
    },
    createElement('strong', null, 'Node note'),
    createElement(
      'label',
      { style: { display: 'grid', gap: 3 } },
      createElement('span', null, 'Note'),
      createElement('textarea', {
        'aria-label': 'Node note',
        value: note,
        onChange: (event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value),
        style: {
          minHeight: 64,
          resize: 'vertical',
          border: '1px solid var(--netlab-border)',
          borderRadius: 6,
          padding: '6px 8px',
          color: 'var(--netlab-text-primary)',
          background: 'var(--netlab-bg-secondary)',
          fontFamily: 'monospace',
        },
      }),
    ),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => onCommit(createNoteEdit(target.nodeId, note)),
        disabled: note.trim().length === 0,
      },
      'Apply note',
    ),
  );
}

export const notesPlugin: PluginEditSpec<NotesPluginEdit> = {
  version: 1,
  kind: 'plugin:example.notes',
  validator: isNotesPluginEdit,
  serializer: {
    encode: (edit) => JSON.stringify({ target: edit.target, note: edit.note }),
    decode: (value) => {
      try {
        const parsed = JSON.parse(value) as unknown;
        const edit = isRecord(parsed) ? { kind: 'plugin:example.notes', ...parsed } : parsed;
        return isNotesPluginEdit(edit) ? edit : null;
      } catch {
        return null;
      }
    },
  },
  reducer: (snapshot, edit) => {
    const next = cloneSnapshot(snapshot);
    return {
      ...next,
      meta: {
        ...(next.meta ?? {}),
        notes: {
          ...(next.meta?.notes ?? {}),
          [edit.target.nodeId]: edit.note,
        },
      },
    };
  },
  editor: NotesEditor,
  labelFn: (edit) => `Note on ${edit.target.nodeId}: ${edit.note}`,
};

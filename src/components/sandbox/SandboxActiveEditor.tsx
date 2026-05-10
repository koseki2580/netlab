import { useId } from 'react';
import { useI18n } from '../../i18n';
import { useSandbox } from '../../sandbox/useSandbox';
import { traceEventIdFromParts } from '../../sandbox/annotations/anchors';
import { getSandboxPluginEditors } from '../../sandbox/plugin/registry';
import { AnnotationEditorPopover } from './annotations/AnnotationEditorPopover';
import { EditPopover } from './EditPopover';
import { PacketEditForm } from './PacketEditForm';
import { AclEditorForm } from './editors/AclEditorForm';
import { LinkEditorForm } from './editors/LinkEditorForm';
import { MtuEditorForm } from './editors/MtuEditorForm';
import { NatEditorForm } from './editors/NatEditorForm';
import { RouteEditorForm } from './editors/RouteEditorForm';

export function SandboxActiveEditor() {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const headingId = useId();
  const activeEditor = sandbox.activeEditor;
  if (!activeEditor) return null;

  const dismiss = sandbox.closeEditPopover;
  const target = activeEditor.target;
  const pluginEditors = getSandboxPluginEditors();

  return (
    <EditPopover
      anchor={target}
      anchorElement={activeEditor.anchorElement}
      labelledBy={headingId}
      onDismiss={dismiss}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <h3 id={headingId} style={{ margin: 0, fontSize: 13 }}>
          {t('sandbox.edits.activeEditor.heading')}
        </h3>
        {target.kind === 'node' && (
          <>
            <RouteEditorForm nodeId={target.nodeId} onSubmitted={dismiss} />
            <MtuEditorForm nodeId={target.nodeId} onSubmitted={dismiss} />
            <NatEditorForm nodeId={target.nodeId} onSubmitted={dismiss} />
            <AclEditorForm nodeId={target.nodeId} onSubmitted={dismiss} />
          </>
        )}
        {target.kind === 'interface' && (
          <MtuEditorForm nodeId={target.nodeId} ifaceId={target.ifaceId} onSubmitted={dismiss} />
        )}
        {target.kind === 'edge' && <LinkEditorForm edgeId={target.edgeId} onSubmitted={dismiss} />}
        {target.kind === 'packet' && (
          <>
            <PacketEditForm target={target} onSubmitted={dismiss} />
            <AnnotationEditorPopover
              traceEventId={traceEventIdFromParts(target.traceId, target.hopIndex)}
              onClose={dismiss}
            />
          </>
        )}
        {pluginEditors.map((PluginEditor, index) => (
          <PluginEditor
            key={`plugin-editor-${index}`}
            target={target}
            onCommit={(edit) => {
              sandbox.pushEdit(edit);
              dismiss();
            }}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </EditPopover>
  );
}

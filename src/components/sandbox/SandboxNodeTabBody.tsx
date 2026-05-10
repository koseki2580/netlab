import { useI18n } from '../../i18n';
import { useSandbox } from '../../sandbox/useSandbox';

function countByKind(kindPrefix: string, kinds: readonly string[]): number {
  return kinds.filter((kind) => kind.startsWith(kindPrefix)).length;
}

export function SandboxNodeTabBody() {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const kinds = sandbox.session.edits.map((edit) => edit.kind);
  const routeCount = countByKind('node.route.', kinds);
  const mtuCount = kinds.filter((kind) => kind === 'interface.mtu').length;
  const linkCount = kinds.filter((kind) => kind === 'link.state').length;
  const natCount = countByKind('node.nat.', kinds);
  const aclCount = countByKind('node.acl.', kinds);

  return (
    <div style={{ display: 'grid', gap: 10, fontFamily: 'monospace' }}>
      <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
        {t('sandbox.edits.node.description')}
      </p>
      {[
        [t('sandbox.edits.node.routes'), routeCount],
        [t('sandbox.edits.node.mtu'), mtuCount],
        [t('sandbox.edits.node.linkState'), linkCount],
        [t('sandbox.edits.node.nat'), natCount],
        [t('sandbox.edits.node.acl'), aclCount],
      ].map(([label, count]) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            padding: '7px 9px',
            background: 'var(--netlab-bg-surface)',
            fontSize: 12,
          }}
        >
          <span>{label}</span>
          <strong>{count}</strong>
        </div>
      ))}
      <button
        type="button"
        className="netlab-focus-ring"
        onClick={sandbox.resetBaseline}
        style={{
          border: '1px solid var(--netlab-border)',
          borderRadius: 6,
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-primary)',
          padding: '6px 8px',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        {t('sandbox.edits.node.reset')}
      </button>
    </div>
  );
}

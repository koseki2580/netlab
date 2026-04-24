import { useSandbox } from '../../sandbox/useSandbox';

function countByKind(kindPrefix: string, kinds: readonly string[]): number {
  return kinds.filter((kind) => kind.startsWith(kindPrefix)).length;
}

export function SandboxNodeTabBody() {
  const sandbox = useSandbox();
  const kinds = sandbox.session.edits.map((edit) => edit.kind);
  const routeCount = countByKind('node.route.', kinds);
  const mtuCount = kinds.filter((kind) => kind === 'interface.mtu').length;
  const linkCount = kinds.filter((kind) => kind === 'link.state').length;
  const natCount = countByKind('node.nat.', kinds);
  const aclCount = countByKind('node.acl.', kinds);

  return (
    <div style={{ display: 'grid', gap: 10, fontFamily: 'monospace' }}>
      <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
        Right-click a node or link on the canvas and choose sandbox editing actions.
      </p>
      {[
        ['Routes', routeCount],
        ['Interface MTU', mtuCount],
        ['Link state', linkCount],
        ['NAT rules', natCount],
        ['ACL rules', aclCount],
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
        Reset sandbox edits
      </button>
    </div>
  );
}

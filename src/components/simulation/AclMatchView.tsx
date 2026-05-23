import type { AclMatchInfo, AclRule } from '../../types/acl';
import { CARD, FIELD_ROW, SECTION_HEADER, TEXT } from '../_styles/tokens';

function formatPortSpec(port: AclRule['srcPort']): string {
  if (port === undefined) return 'any';
  if (typeof port === 'number') return String(port);
  return `${port.from}-${port.to}`;
}

export function formatAclRule(rule: AclRule): string {
  const tokens = [`#${rule.priority}`, rule.action, rule.protocol, rule.srcIp ?? 'any'];

  if (rule.srcPort !== undefined) {
    tokens.push('src', formatPortSpec(rule.srcPort));
  }

  tokens.push(rule.dstIp ?? 'any');

  if (rule.dstPort !== undefined) {
    tokens.push('dst', formatPortSpec(rule.dstPort));
  }

  return tokens.join(' ');
}

function FieldRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        ...FIELD_ROW,
        alignItems: 'start',
      }}
    >
      <span style={{ color: TEXT.secondary }}>{label}</span>
      <span style={{ color: valueColor ?? TEXT.primary, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

export function AclMatchView({ aclMatch }: { aclMatch: AclMatchInfo }) {
  const ruleText = aclMatch.byConnTrack
    ? 'stateful return traffic'
    : aclMatch.matchedRule
      ? formatAclRule(aclMatch.matchedRule)
      : '(default policy)';
  const ruleColor = aclMatch.byConnTrack
    ? 'var(--netlab-text-primary)'
    : aclMatch.matchedRule
      ? 'var(--netlab-text-primary)'
      : 'var(--netlab-text-muted)';
  const actionColor =
    aclMatch.action === 'permit' ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-red)';

  return (
    <section style={CARD}>
      <div style={SECTION_HEADER}>ACL FILTER</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        <FieldRow label="Direction" value={aclMatch.direction.toUpperCase()} />
        <FieldRow label="Interface" value={aclMatch.interfaceName} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '84px minmax(0, 1fr)',
            gap: 10,
            alignItems: 'start',
          }}
        >
          <span style={{ color: 'var(--netlab-text-secondary)' }}>Rule</span>
          <span style={{ color: ruleColor, wordBreak: 'break-word' }}>
            {ruleText}
            {aclMatch.byConnTrack && (
              <span style={{ color: 'var(--netlab-text-secondary)' }}> (conn-track)</span>
            )}
          </span>
        </div>
        <FieldRow label="Action" value={aclMatch.action.toUpperCase()} valueColor={actionColor} />
      </div>
    </section>
  );
}

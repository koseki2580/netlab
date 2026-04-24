import { useMemo, useState } from 'react';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { StaticRoute } from '../../../sandbox/types';
import { validateStaticRoute } from '../../../sandbox/validation/route';
import type { StaticRouteConfig } from '../../../types/routing';
import { buttonStyle, fieldStyle, sectionStyle } from './editorStyles';

interface RuntimeStaticRoute extends StaticRouteConfig {
  readonly id?: string;
  readonly outInterface?: string;
}

export function RouteEditorForm({
  nodeId,
  onSubmitted,
}: {
  readonly nodeId: string;
  readonly onSubmitted?: () => void;
}) {
  const sandbox = useSandbox();
  const topology = sandbox.engine.whatIf.getTopology();
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  const interfaces = node?.data.interfaces ?? [];
  const routes = (node?.data.staticRoutes ?? []) as RuntimeStaticRoute[];
  const defaultInterface = interfaces[0]?.id ?? '';
  const [prefix, setPrefix] = useState('0.0.0.0/0');
  const [nextHop, setNextHop] = useState('direct');
  const [outInterface, setOutInterface] = useState(defaultInterface);
  const [metric, setMetric] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const routeRows = useMemo(
    () =>
      routes.map((route, index) => ({
        id: route.id ?? `${route.destination}-${route.nextHop}-${index}`,
        prefix: route.destination,
        nextHop: route.nextHop,
        outInterface: route.outInterface ?? defaultInterface,
        metric: route.metric ?? 1,
      })),
    [defaultInterface, routes],
  );

  const submit = () => {
    const route: StaticRoute = {
      id: crypto.randomUUID(),
      prefix,
      nextHop,
      outInterface,
      metric: Number(metric),
    };
    const validation = validateStaticRoute(topology, nodeId, route);
    if (!validation.ok) {
      setError(`Route rejected: ${validation.reason}`);
      return;
    }

    sandbox.setDiffFilter('route');
    sandbox.pushEdit({ kind: 'node.route.add', target: { kind: 'node', nodeId }, route });
    onSubmitted?.();
  };

  if (!node) {
    return <p style={{ color: 'var(--netlab-text-muted)' }}>Node not found.</p>;
  }

  return (
    <section style={sectionStyle} aria-label="Route editor">
      <strong>Routes</strong>
      {routeRows.length === 0 ? (
        <span style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>No static routes.</span>
      ) : (
        routeRows.map((route) => (
          <div key={route.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 11 }}>
              {route.prefix} via {route.nextHop}
            </span>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => {
                sandbox.setDiffFilter('route');
                sandbox.pushEdit({
                  kind: 'node.route.remove',
                  target: { kind: 'node', nodeId },
                  routeId: route.id,
                });
                onSubmitted?.();
              }}
            >
              Remove
            </button>
          </div>
        ))
      )}
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Prefix</span>
        <input
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Next hop</span>
        <input
          aria-label="Next hop"
          value={nextHop}
          onChange={(event) => setNextHop(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Interface</span>
        <select
          aria-label="Route interface"
          value={outInterface}
          onChange={(event) => setOutInterface(event.target.value)}
          style={fieldStyle}
        >
          {interfaces.map((iface) => (
            <option key={iface.id} value={iface.id}>
              {iface.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Metric</span>
        <input
          aria-label="Route metric"
          value={metric}
          onChange={(event) => setMetric(event.target.value)}
          style={fieldStyle}
        />
      </label>
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
      <button type="button" style={buttonStyle} onClick={submit}>
        Add route
      </button>
    </section>
  );
}

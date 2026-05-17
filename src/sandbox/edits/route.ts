import type { StaticRouteConfig } from '../../types/routing';
import type { SimulationSnapshot, StaticRoute } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { replaceNode, withTopology } from './helpers';

type RuntimeStaticRoute = StaticRouteConfig & {
  readonly id?: string;
  readonly outInterface?: string;
};

function routeId(route: RuntimeStaticRoute): string | null {
  return typeof route.id === 'string' ? route.id : null;
}

function toRuntimeRoute(route: StaticRoute): RuntimeStaticRoute {
  return {
    id: route.id,
    destination: route.prefix,
    nextHop: route.nextHop,
    outInterface: route.outInterface,
    metric: route.metric,
  };
}

function routeAdd(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.route.add' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = (node.data.staticRoutes ?? []) as RuntimeStaticRoute[];
    if (existing.some((route) => routeId(route) === edit.route.id)) {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        staticRoutes: [...existing, toRuntimeRoute(edit.route)],
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function routeRemove(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.route.remove' }>,
) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = (node.data.staticRoutes ?? []) as RuntimeStaticRoute[];
    const nextRoutes = existing.filter((route) => routeId(route) !== edit.routeId);
    if (nextRoutes.length === existing.length) return node;
    return { ...node, data: { ...node.data, staticRoutes: nextRoutes } };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function routeEdit(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.route.edit' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = (node.data.staticRoutes ?? []) as RuntimeStaticRoute[];
    let changed = false;
    const nextRoutes = existing.map((route) => {
      if (routeId(route) !== edit.routeId) return route;
      changed = true;
      return toRuntimeRoute(edit.after);
    });
    return changed ? { ...node, data: { ...node.data, staticRoutes: nextRoutes } } : node;
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

registerReducer('node.route.add', routeAdd);
registerReducer('node.route.remove', routeRemove);
registerReducer('node.route.edit', routeEdit);

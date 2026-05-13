export type AddressFamily = 'v4' | 'v6';

export interface FamilyAware<T> {
  readonly af: AddressFamily;
  readonly value: T;
}

export interface RouteFamilyInput {
  readonly destination: string;
  readonly af?: AddressFamily;
}

export interface RouteResolutionInput extends RouteFamilyInput {
  readonly nodeId: string;
}

export function inferRouteAddressFamily(route: RouteFamilyInput): AddressFamily {
  if (route.af !== undefined) return route.af;
  return route.destination.includes(':') ? 'v6' : 'v4';
}

export function routeResolutionKey(route: RouteResolutionInput): string {
  return `${route.nodeId}::${inferRouteAddressFamily(route)}::${route.destination}`;
}

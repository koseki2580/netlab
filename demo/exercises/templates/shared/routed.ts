/** What the static-route templates share. */

import type { StaticRouteConfig } from '../../../../src/types/routing';
import type { Localised, SettingChange } from '../../model/types';
import type { RoutedNet } from './build';
import { goals, type LabelledCheck } from './exercise';
import type { Place } from './places';
import { WATCH_WORDS } from '../../ui/words';
import { L, the, The } from './text';

export const routes = (nodeId: string, list: readonly StaticRouteConfig[]): SettingChange => ({
  kind: 'static-routes',
  nodeId,
  routes: list,
});

/** Every route a router needs, as the healthy network has them. */
export const fullRoutes = (net: RoutedNet, routerId: string): readonly StaticRouteConfig[] =>
  net.routers.find((entry) => entry.id === routerId)?.routes ?? [];

/** The PC reaches the far device (and, in the hub shape, the second site too). */
export function routedGoals(net: RoutedNet): LabelledCheck[] {
  const { reach } = goals(net.names);
  return [reach(net.pc, net.srv), ...(net.other !== undefined ? [reach(net.pc, net.other)] : [])];
}

/** What a route and its next router are, said once per brief. */
export const ROUTE_GLOSS = L(
  'A router only knows the networks plugged into it. For any other network it needs a route: a line that says "for that network, hand it to this neighbouring router". That neighbour is called the next router, and the line names it by its address.',
  'ルータが知っているのは、自分に直接つながっているネットワークだけです。それ以外のネットワークへ送るには、経路がいります。経路とは「このネットワークあては、となりのこのルータに渡す」という 1 行のことです。そのとなりのルータを「次のルータ」といい、そのアドレスを書きます。',
);

/** The rule line of a route exercise. */
export const RULE_ROUTE = L(
  'Rule: a route names the destination network and the next router: the neighbouring router, by its address on the side facing this one.',
  'ルール：経路には「行き先のネットワーク」と「次のルータ」のアドレスを書く。次のルータは、ケーブルでじかにつながった、となりのルータ。',
);

/** Hint 1 of a route exercise: what the page offers for finding where it stops. */
export const WATCH_WHERE_IT_STOPS = L(
  `Under the result, press "${WATCH_WORDS.en}" and follow it: at which router does it stop?`,
  `結果の下にある「${WATCH_WORDS.ja}」を押して、通り道を見てください。どのルータで止まりますか。`,
);

/** In place of "this router has no route for …", once the learner has written one that does not work. */
export const routeIsThereNow = (routerName: Localised, destination: string): Localised =>
  L(
    `${routerName.en.charAt(0).toUpperCase()}${routerName.en.slice(1)} has a route for ${destination} now. If it still does not arrive, look at its next router: it must be the address of the neighbouring router, on the side facing this one. Compare it with the diagram.`,
    `${routerName.ja}には、${destination} あての経路が入りました。それでも届かないなら、その経路の「次のルータ」を見てください。となりのルータの、こちらを向いた側のアドレスになっていますか。図と見くらべてください。`,
  );

/** The rule of a route and where the next router's address is found, for hint 2. */
export const ROUTE_RULE = L(
  "A route says: for this destination network, hand it to this neighbouring router. The neighbour's address is on the diagram, under that router: the one on the side facing this router.",
  '経路は「この行き先のネットワークあては、となりのこのルータに渡す」という行です。となりのルータのアドレスは、図でそのルータの下にあります。こちらのルータを向いた側のアドレスです。',
);

/** Where the two sites are and what the PC wants, per place. */
export function sitesOpening(place: Place): Localised {
  const { near, far } = place.sites;
  return L(
    `${The(near.name)} and ${the(far.name)} are joined by routers. ${The(near.device)} needs ${the(far.device)} at ${the(far.name)}.`,
    `${near.name.ja}と${far.name.ja}は、ルータでつながっています。${near.device.ja}から、${far.name.ja}の${far.device.ja}を使います。`,
  );
}

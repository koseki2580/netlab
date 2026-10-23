import type { ComponentType } from 'react';
import type { ResolvedTarget } from '../PanelChrome';
import type { DpTab } from '../useNodeDetailDock';
import { AclTab } from './AclTab';
import { ArpServicesTab, type ArpServicesTabProps } from './ArpServicesTab';
import { EdgeTab, type EdgeTabProps } from './EdgeTab';
import { IfacesTab, type IfacesTabProps } from './IfacesTab';
import { OverviewTab, type OverviewTabProps } from './OverviewTab';
import { RoutesTab, type RoutesTabProps } from './RoutesTab';
import { SandboxTab, type SandboxTabProps } from './SandboxTab';

/** What decides which tabs a selection offers. */
export interface DpTabContext {
  target: ResolvedTarget;
  /** A sandbox is there to edit the selection in (the panel was given one). */
  sandbox: boolean;
}

/**
 * Everything a device tab is drawn from. Each tab component takes the part of
 * it it needs, so an entry names its component and nothing else.
 */
export type NodeTabProps = OverviewTabProps &
  IfacesTabProps &
  RoutesTabProps &
  ArpServicesTabProps &
  SandboxTabProps;

interface TabEntryBase {
  id: DpTab;
  labelKey: string;
  visible: (context: DpTabContext) => boolean;
}

export type DpTabEntry =
  | (TabEntryBase & { target: 'node'; Component: ComponentType<NodeTabProps> })
  | (TabEntryBase & { target: 'edge'; Component: ComponentType<EdgeTabProps> });

const always = () => true;
const isRouterOrSwitch = ({ target }: DpTabContext) =>
  target.role === 'router' || target.role === 'switch';
const isDevice = (context: DpTabContext) =>
  isRouterOrSwitch(context) || context.target.role === 'client' || context.target.role === 'server';

/**
 * Every detail-panel tab, in the order the panel lists them.
 *
 * Adding a tab is one entry here (and its DpTab id in useNodeDetailDock, which
 * is also what a stored choice is checked against).
 */
export const DP_TABS: readonly DpTabEntry[] = [
  {
    target: 'edge',
    id: 'overview',
    labelKey: 'simulation.nodeDetail.tab.overview',
    visible: always,
    Component: EdgeTab,
  },
  {
    target: 'node',
    id: 'overview',
    labelKey: 'simulation.nodeDetail.tab.overview',
    visible: always,
    Component: OverviewTab,
  },
  {
    target: 'node',
    id: 'ifaces',
    labelKey: 'simulation.nodeDetail.tab.interfaces',
    visible: isRouterOrSwitch,
    Component: IfacesTab,
  },
  {
    target: 'node',
    id: 'routes',
    labelKey: 'simulation.nodeDetail.tab.routes',
    visible: ({ target }) => target.role === 'router',
    Component: RoutesTab,
  },
  {
    target: 'node',
    id: 'arp',
    labelKey: 'simulation.nodeDetail.tab.arpServices',
    visible: isRouterOrSwitch,
    Component: ArpServicesTab,
  },
  {
    target: 'node',
    id: 'acl',
    labelKey: 'simulation.nodeDetail.tab.acl',
    // Not shown: it only ever said it was not wired to the simulation yet, and
    // a tab that holds nothing is one more thing for a learner to open for
    // nothing. `AclTab` stays, so showing it again is this one line.
    visible: () => false,
    Component: AclTab,
  },
  {
    target: 'node',
    id: 'sandbox',
    labelKey: 'simulation.nodeDetail.tab.sandbox',
    // Registered only when there is a sandbox to edit the device in.
    visible: (context) => context.sandbox && isDevice(context),
    Component: SandboxTab,
  },
];

/** The tabs a selection offers, in panel order. */
export function visibleTabs(context: DpTabContext): DpTabEntry[] {
  return DP_TABS.filter((tab) => tab.target === context.target.kind && tab.visible(context));
}

/**
 * The tab a selection opens on: the sandbox when it can be edited there, a
 * router's or switch's interfaces, and otherwise the overview.
 */
export function defaultTab(context: DpTabContext): DpTab {
  const offered = visibleTabs(context).map((tab) => tab.id);
  return (['sandbox', 'ifaces'] as const).find((id) => offered.includes(id)) ?? 'overview';
}

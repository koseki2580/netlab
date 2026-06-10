import DemoShell from '../DemoShell';
import { RoutingDrillPanel } from '../../src/components/learning/RoutingDrillPanel';
import { readDemoEmbedParams } from '../embedParams';

export { RoutingDrillPanel };

export default function RoutingDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Routing Decision"
      desc="Drill longest-prefix match: which next-hop does the router choose?"
      embedded={embedded}
    >
      <RoutingDrillPanel />
    </DemoShell>
  );
}

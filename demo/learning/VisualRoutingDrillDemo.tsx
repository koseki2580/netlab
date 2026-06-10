import DemoShell from '../DemoShell';
import { VisualRoutingDrillPanel } from '../../src/components/learning/VisualRoutingDrillPanel';
import { readDemoEmbedParams } from '../embedParams';

export { VisualRoutingDrillPanel };

export default function VisualRoutingDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Routing Decision — on the network"
      desc="Answer longest-prefix-match questions by clicking the next-hop router on the canvas"
      embedded={embedded}
    >
      <VisualRoutingDrillPanel />
    </DemoShell>
  );
}

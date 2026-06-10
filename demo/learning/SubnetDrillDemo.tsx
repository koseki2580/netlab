import DemoShell from '../DemoShell';
import { SubnetDrillPanel } from '../../src/components/learning/SubnetDrillPanel';
import { readDemoEmbedParams } from '../embedParams';

export { SubnetDrillPanel };

export default function SubnetDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Subnetting Practice"
      desc="Drill IPv4 subnet math with instant, explained feedback"
      embedded={embedded}
    >
      <SubnetDrillPanel />
    </DemoShell>
  );
}

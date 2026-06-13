import DemoShell from '../DemoShell';
import { RoutingDrillPanel } from '../../src/components/learning/RoutingDrillPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';

export { RoutingDrillPanel };

export default function RoutingDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Routing Decision"
      desc="Drill longest-prefix match: which next-hop does the router choose?"
      embedded={embedded}
    >
      <I18nProvider locale={readLearningLocale()}>
        <RoutingDrillPanel />
      </I18nProvider>
    </DemoShell>
  );
}

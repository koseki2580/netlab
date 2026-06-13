import DemoShell from '../DemoShell';
import { VisualRoutingDrillPanel } from '../../src/components/learning/VisualRoutingDrillPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';

export { VisualRoutingDrillPanel };

export default function VisualRoutingDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Routing Decision — on the network"
      desc="Answer longest-prefix-match questions by clicking the next-hop router on the canvas"
      embedded={embedded}
    >
      <I18nProvider locale={readLearningLocale()}>
        <VisualRoutingDrillPanel />
      </I18nProvider>
    </DemoShell>
  );
}

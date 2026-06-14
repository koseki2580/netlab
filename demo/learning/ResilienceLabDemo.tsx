import DemoShell from '../DemoShell';
import { ResilienceLabPanel } from '../../src/components/learning/ResilienceLabPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';

export { ResilienceLabPanel };

export default function ResilienceLabDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Resilience Lab"
      desc="Break the network and predict the fallout — the live engine reveals what reroutes and what dies"
      embedded={embedded}
    >
      <I18nProvider locale={readLearningLocale()}>
        <ResilienceLabPanel />
      </I18nProvider>
    </DemoShell>
  );
}

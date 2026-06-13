import DemoShell from '../DemoShell';
import { SubnetDrillPanel } from '../../src/components/learning/SubnetDrillPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';

export { SubnetDrillPanel };

export default function SubnetDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Subnetting Practice"
      desc="Drill IPv4 subnet math with instant, explained feedback"
      embedded={embedded}
    >
      <I18nProvider locale={readLearningLocale()}>
        <SubnetDrillPanel />
      </I18nProvider>
    </DemoShell>
  );
}

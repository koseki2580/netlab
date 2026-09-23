import DemoShell from '../DemoShell';
import { SubnetDrillPanel } from '../../src/components/learning/SubnetDrillPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';
import { SubnetStarter } from './SubnetStarter';

export { SubnetDrillPanel };

export default function SubnetDrillDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Subnetting Practice"
      desc="Drill IPv4 subnet math with instant, explained feedback"
      embedded={embedded}
    >
      <div
        style={{
          height: '100%',
          overflow: 'auto',
          display: 'grid',
          gap: 16,
          padding: 16,
          alignContent: 'start',
        }}
      >
        {/* The plain rule and four tries come first; the arithmetic drill after. */}
        <SubnetStarter />
        <I18nProvider locale={readLearningLocale()}>
          <SubnetDrillPanel />
        </I18nProvider>
      </div>
    </DemoShell>
  );
}

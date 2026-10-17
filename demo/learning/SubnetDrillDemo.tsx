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
        {/* The drill's frame takes `height: 100%` and scrolls inside it. As a
            grid item here that height was the grid row's, and the card became
            a 64px window over 400px or more of drill. Inside a block of its own
            the percentage has nothing to resolve against, so the card is as
            tall as its content and the page scrolls instead. */}
        <div data-testid="subnet-drill-slot">
          <I18nProvider locale={readLearningLocale()}>
            <SubnetDrillPanel />
          </I18nProvider>
        </div>
      </div>
    </DemoShell>
  );
}

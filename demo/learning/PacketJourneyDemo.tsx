import DemoShell from '../DemoShell';
import { PacketJourneyPanel } from '../../src/components/learning/PacketJourneyPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';

export { PacketJourneyPanel };

export default function PacketJourneyDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Packet Journey"
      desc="Predict each hop of a real packet — the live engine grades you and explains its own decisions"
      embedded={embedded}
    >
      <I18nProvider locale={readLearningLocale()}>
        <PacketJourneyPanel />
      </I18nProvider>
    </DemoShell>
  );
}

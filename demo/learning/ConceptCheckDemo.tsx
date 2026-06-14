import DemoShell from '../DemoShell';
import { ConceptCheckPanel } from '../../src/components/learning/ConceptCheckPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';

export { ConceptCheckPanel };

export default function ConceptCheckDemo() {
  const { embedded } = readDemoEmbedParams();
  return (
    <DemoShell
      title="Protocol Concept Checks"
      desc="Quick active-recall quizzes across the protocol stack, from L2 to security"
      embedded={embedded}
    >
      <I18nProvider locale={readLearningLocale()}>
        <ConceptCheckPanel />
      </I18nProvider>
    </DemoShell>
  );
}

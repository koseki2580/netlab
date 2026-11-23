import { useLocation } from 'react-router-dom';
import DemoShell from '../DemoShell';
import { ConceptCheckPanel } from '../../src/components/learning/ConceptCheckPanel';
import { I18nProvider } from '../../src/i18n';
import { readDemoEmbedParams } from '../embedParams';
import { readLearningLocale } from './learningLocale';

export { ConceptCheckPanel };

/** `?review=arp,vlan` → the decks the review queue is limited to; none → every deck. */
function reviewScopeFrom(search: string): readonly string[] | undefined {
  const decks = (new URLSearchParams(search).get('review') ?? '')
    .split(',')
    .map((deck) => deck.trim())
    .filter((deck) => deck !== '');
  return decks.length > 0 ? decks : undefined;
}

export default function ConceptCheckDemo() {
  const { embedded } = readDemoEmbedParams();
  const reviewScope = reviewScopeFrom(useLocation().search);
  return (
    <DemoShell
      title="Protocol Concept Checks"
      desc="Quick active-recall quizzes across the protocol stack, from L2 to security"
      embedded={embedded}
    >
      <I18nProvider locale={readLearningLocale()}>
        <ConceptCheckPanel {...(reviewScope ? { reviewScope } : {})} />
      </I18nProvider>
    </DemoShell>
  );
}

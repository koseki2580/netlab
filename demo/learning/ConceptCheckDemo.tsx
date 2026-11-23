import { Link, useLocation } from 'react-router-dom';
import DemoShell from '../DemoShell';
import { ConceptCheckPanel } from '../../src/components/learning/ConceptCheckPanel';
import { pillButton } from '../../src/components/learning/drillKit';
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
  const locale = readLearningLocale();
  // Arrived from the learning path's "N reviews" link: start that review at
  // once, and end it with the way back to the path (REQ-428).
  const fromPath = reviewScope
    ? {
        reviewScope,
        autoStartReview: true,
        endActions: (
          <Link
            to="/path"
            className="netlab-focus-ring"
            style={{ ...pillButton('var(--netlab-accent-cyan)'), textDecoration: 'none' }}
          >
            {locale === 'ja' ? '← 学習の道すじへ' : '← Back to the learning path'}
          </Link>
        ),
      }
    : {};
  return (
    <DemoShell
      title="Protocol Concept Checks"
      desc="Quick active-recall quizzes across the protocol stack, from L2 to security"
      embedded={embedded}
    >
      <I18nProvider locale={locale}>
        <ConceptCheckPanel {...fromPath} />
      </I18nProvider>
    </DemoShell>
  );
}

import { Link } from 'react-router-dom';
import { useGalleryLocale, useT } from '../../localeContext';
import { levelTemplates, nextOfKind } from '../exerciseSource';
import {
  explain,
  headline,
  quotedTitle,
  stillMissing,
  whatNext,
  type LevelSummary,
} from '../store/estimate';
import type { AttemptRecord } from '../store/types';
import { exercisePath } from './pageParts';
import { LINK, MUTED } from './styles';

/**
 * Where the learner stands at a level, as the hub and the level page say it:
 * two short lines (how many are solved and how many more it takes; which
 * kinds of task are still open, or what comes next once it is cleared), and
 * the whole rule behind a toggle. The paragraph the rule used to be was some
 * two hundred characters, and nobody read it.
 */
export function LevelLines({
  summary,
  attempts,
}: {
  summary: LevelSummary;
  /** The learner's record: with it, a kind still open is offered directly. */
  attempts?: readonly AttemptRecord[];
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const { level } = summary;
  const missing = stillMissing(
    summary,
    locale,
    (id) => levelTemplates(level).find((template) => template.id === id)?.title,
  );
  const next = whatNext(summary, locale);
  // One or two kinds left: each is named with the way straight to it. (A
  // learner with one kind left waited nine exercises for it to come round.)
  const few =
    attempts !== undefined &&
    summary.status === 'in-progress' &&
    summary.missingKinds.length > 0 &&
    summary.missingKinds.length <= 2
      ? summary.missingKinds.flatMap((id) => {
          const title = levelTemplates(level).find((template) => template.id === id)?.title;
          const exerciseId = nextOfKind(level, id, attempts);
          return title && exerciseId !== undefined ? [{ id, title, exerciseId }] : [];
        })
      : [];
  return (
    <>
      <p
        data-testid={`exercises-level-headline-${level}`}
        data-status={summary.status}
        style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}
      >
        {headline(summary, locale)}
      </p>
      {few.length > 0 ? (
        <ul
          data-testid={`exercises-level-missing-${level}`}
          style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}
        >
          {few.map((kind) => (
            <li key={kind.id} style={{ lineHeight: 1.6 }}>
              {t(
                `${summary.missingKinds.length} ${summary.missingKinds.length === 1 ? 'kind' : 'kinds'} to go: `,
                `あと ${summary.missingKinds.length} 種類：`,
              )}
              {quotedTitle(kind.title[locale], locale)}{' '}
              <Link
                to={exercisePath(kind.exerciseId)}
                data-testid={`exercises-do-kind-${kind.id}`}
                style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
              >
                {t('→ Do this kind', '→ この種類をやる')}
              </Link>
            </li>
          ))}
        </ul>
      ) : missing !== null ? (
        <p data-testid={`exercises-level-missing-${level}`} style={{ margin: 0, lineHeight: 1.6 }}>
          {missing}
        </p>
      ) : null}
      {next !== null ? (
        <p data-testid={`exercises-level-next-${level}`} style={{ margin: 0, lineHeight: 1.6 }}>
          {next}{' '}
          <Link
            to="/course/exam"
            data-testid={`exercises-level-exam-${level}`}
            style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
          >
            {t('Go to the final test', '修了テストへ')}
          </Link>
        </p>
      ) : null}
      <details data-testid={`exercises-level-rule-${level}`}>
        <summary style={{ cursor: 'pointer', minHeight: 32, fontSize: 14 }}>
          {t('See the full rule', 'くわしい判定のしかたを見る')}
        </summary>
        <p
          data-testid={`exercises-level-status-${level}`}
          style={{ ...MUTED, margin: '4px 0 0', fontSize: 14, lineHeight: 1.7 }}
        >
          {explain(summary, locale)}
        </p>
      </details>
    </>
  );
}

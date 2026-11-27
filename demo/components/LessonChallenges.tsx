import { useEffect, useState } from 'react';
import { useT } from '../localeContext';
import { LESSON_CARD, LESSON_LABEL, lessonChoice } from './lessonStyles';

/** A sentence in both languages. */
export interface Bilingual {
  readonly en: string;
  readonly ja: string;
}

/**
 * One challenge: a goal the learner reaches with the lesson's own controls
 * (REQ-449). `reached` is what the lesson's model says about the current
 * settings; the lesson computes it, this component only shows it.
 */
export interface Challenge {
  readonly id: string;
  /** The goal, with any limit ("change one control only"). */
  readonly goal: Bilingual;
  /** Shown only on request. */
  readonly hint: Bilingual;
  /** Whether the current settings reach the goal. */
  readonly reached: boolean;
  /** Why a setting that reaches the goal works, with the model's numbers. */
  readonly why: Bilingual;
}

const storageKey = (lessonId: string) => `netlab-challenges-${lessonId}`;

function readReached(lessonId: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(lessonId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeReached(lessonId: string, ids: readonly string[]): void {
  try {
    if (ids.length === 0) window.localStorage.removeItem(storageKey(lessonId));
    else window.localStorage.setItem(storageKey(lessonId), JSON.stringify(ids));
  } catch {
    // Storage may be unavailable (private window); the challenges still work for this visit.
  }
}

/**
 * After a lesson's first reveal, the reverse of predicting: goals reached by
 * operating the lesson (REQ-449). A reached challenge stays reached, in this
 * browser, so the learner can move the controls on to the next one.
 */
export function LessonChallenges({
  lessonId,
  challenges,
}: {
  lessonId: string;
  challenges: readonly Challenge[];
}) {
  const t = useT();
  const [remembered, setRemembered] = useState<readonly string[]>(() => readReached(lessonId));
  const [hints, setHints] = useState<ReadonlySet<string>>(new Set());

  const nowReached = challenges.filter((challenge) => challenge.reached).map((c) => c.id);
  useEffect(() => {
    const added = nowReached.filter((id) => !remembered.includes(id));
    if (added.length === 0) return;
    const next = [...remembered, ...added];
    setRemembered(next);
    writeReached(lessonId, next);
  }, [lessonId, nowReached, remembered]);

  const isReached = (id: string) => remembered.includes(id) || nowReached.includes(id);
  const count = challenges.filter((challenge) => isReached(challenge.id)).length;

  return (
    <section data-testid="challenges" style={LESSON_CARD} aria-label={t('Challenges', '挑戦')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={LESSON_LABEL}>{t('Now make it happen', '自分で起こしてみよう')}</div>
        <div data-testid="challenges-count" data-reached={count} aria-live="polite">
          {t(`${count} / ${challenges.length} reached`, `${count} / ${challenges.length} 達成`)}
        </div>
      </div>
      <p style={{ margin: '4px 0 10px', lineHeight: 1.7 }}>
        {t(
          'Use the controls above to reach each goal. The lesson checks the settings you choose.',
          '上の操作で、それぞれの目標を実現してください。選んだ設定をレッスンが確かめます。',
        )}
      </p>
      <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
        {challenges.map((challenge) => {
          const reached = isReached(challenge.id);
          const hintOpen = hints.has(challenge.id);
          return (
            <li
              key={challenge.id}
              data-testid={`challenge-${challenge.id}`}
              data-reached={String(reached)}
              style={{ lineHeight: 1.7 }}
            >
              <div>
                <strong>{reached ? t('✓ Reached: ', '✓ 達成：') : t('Goal: ', '目標：')}</strong>
                {t(challenge.goal.en, challenge.goal.ja)}
              </div>
              {reached ? (
                <p data-testid={`challenge-${challenge.id}-why`} style={{ margin: '4px 0 0' }}>
                  {t(challenge.why.en, challenge.why.ja)}
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    data-testid={`challenge-${challenge.id}-hint-button`}
                    aria-expanded={hintOpen}
                    onClick={() =>
                      setHints((open) => {
                        const next = new Set(open);
                        if (next.has(challenge.id)) next.delete(challenge.id);
                        else next.add(challenge.id);
                        return next;
                      })
                    }
                    style={{ ...lessonChoice(hintOpen), marginTop: 6, width: 'auto' }}
                  >
                    {hintOpen
                      ? t('Hide the hint', 'ヒントを隠す')
                      : t('Show a hint', 'ヒントを見る')}
                  </button>
                  {hintOpen && (
                    <p data-testid={`challenge-${challenge.id}-hint`} style={{ margin: '6px 0 0' }}>
                      {t(challenge.hint.en, challenge.hint.ja)}
                    </p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
      {count > 0 && (
        <button
          type="button"
          data-testid="challenges-reset"
          onClick={() => {
            setRemembered([]);
            writeReached(lessonId, []);
          }}
          style={{ ...lessonChoice(false), marginTop: 12, width: 'auto' }}
        >
          {t('Start the challenges again', '挑戦をやり直す')}
        </button>
      )}
    </section>
  );
}

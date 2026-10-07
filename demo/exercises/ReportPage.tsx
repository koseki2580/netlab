import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGalleryLocale, useT } from '../localeContext';
import { levelTemplates } from './exerciseSource';
import type { AttemptStore } from './store/attemptStore';
import { EXERCISE_LEVELS, estimatedLevel, explain, levelSummary } from './store/estimate';
import { cycleReport, type CycleSetCount } from './store/studyCycle';
import { lessonTitle } from './ui/lessonTitle';
import { ExerciseShell, LEVEL_NAMES } from './ui/pageParts';
import { CARD, COLUMN, LINK, MUTED, PAGE, SECONDARY } from './ui/styles';
import { StorageNotice, useExerciseStore } from './ui/useExerciseStore';

type Copied = 'idle' | 'copied' | 'failed';

/**
 * The learner's record: each level in one sentence, every before/after cycle
 * as a comparison, and the record itself to take away or to clear.
 */
export function ReportPageBody({ store: injected }: { store?: AttemptStore }) {
  const t = useT();
  const locale = useGalleryLocale();
  const { store, state } = useExerciseStore(injected);
  const [copied, setCopied] = useState<Copied>('idle');
  const [confirming, setConfirming] = useState(false);
  const estimate = estimatedLevel(state.attempts, state.placement);

  const count = (set: CycleSetCount) =>
    t(`${set.solved} of ${set.total}`, `${set.total} 問中 ${set.solved} 問`);

  const download = () => {
    const url = URL.createObjectURL(new Blob([store.exportJson()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'netlab-exercises.json';
    link.click();
    URL.revokeObjectURL(url);
  };
  const copy = () => {
    navigator.clipboard.writeText(store.exportJson()).then(
      () => setCopied('copied'),
      () => setCopied('failed'),
    );
  };

  return (
    <div style={PAGE}>
      <div style={COLUMN}>
        <Link
          to="/exercises"
          style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
        >
          {t('← All levels', '← レベルの一覧へ')}
        </Link>

        <StorageNotice store={store} />

        <section data-testid="report-levels" style={{ ...CARD, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{t('My record', '自分の記録')}</h2>
          <p
            data-testid="report-estimate"
            data-level={estimate}
            style={{ margin: 0, fontWeight: 700 }}
          >
            {estimate === 0
              ? t('No level is cleared yet.', '達成したレベルは、まだありません。')
              : t(`Cleared up to level ${estimate}.`, `レベル ${estimate} まで達成しています。`)}
          </p>
          {EXERCISE_LEVELS.map((level) => (
            <div key={level} data-testid={`report-level-${level}`}>
              <strong>
                {t(`Level ${level}`, `レベル ${level}`)} — {LEVEL_NAMES[level][locale]}
              </strong>
              <p style={{ margin: '2px 0 0' }}>
                {explain(levelSummary(state.attempts, level), locale)}
              </p>
            </div>
          ))}
        </section>

        <section data-testid="report-cycles" style={{ ...CARD, display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {t('Before and after studying', '学ぶ前と、学んだあと')}
          </h2>
          {state.cycles.length === 0 ? (
            <p style={{ margin: 0 }}>
              {t(
                'Nothing measured yet. On a level’s page, “Measure before studying” starts a comparison.',
                'まだ測っていません。レベルのページの「学ぶ前に測る」から始められます。',
              )}
            </p>
          ) : (
            <p style={{ ...MUTED, margin: 0, fontSize: 14 }}>
              {t(
                'A comparison of the same kinds of task on different exercises, counted as solved without help. The sets are small, so read it as a comparison, not as proof of what the lessons did.',
                '同じ種類の、別の問題で比べた結果です（ヒントなしで解けた数）。問題数が少ないので、レッスンの効果の証明ではなく、比べた結果として見てください。',
              )}
            </p>
          )}
          {[...state.cycles].reverse().map((cycle) => {
            const report = cycleReport(cycle, state.attempts);
            const titles = levelTemplates(cycle.level);
            return (
              <div
                key={cycle.id}
                data-testid={`report-cycle-${cycle.id}`}
                style={{ display: 'grid', gap: 6 }}
              >
                <strong>
                  {t(`Level ${cycle.level}`, `レベル ${cycle.level}`)} —{' '}
                  {new Date(cycle.startedAt).toLocaleDateString(locale)}
                </strong>
                <p data-testid={`report-cycle-total-${cycle.id}`} style={{ margin: 0 }}>
                  {t(
                    `Before: ${count(report.before)} → after: ${count(report.after)}.`,
                    `学ぶ前：${count(report.before)} → 学んだあと：${count(report.after)}。`,
                  )}
                  {report.afterComplete
                    ? ''
                    : t(
                        ' (The “after” set is not finished.)',
                        '（学んだあとの確認は、まだ途中です。）',
                      )}
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 2 }}>
                  {report.templates.map((entry) => (
                    <li key={entry.templateId} data-testid={`report-cycle-row-${entry.templateId}`}>
                      {titles.find((template) => template.id === entry.templateId)?.title[locale] ??
                        entry.templateId}
                      {t(
                        `: before ${entry.before.solved}/${entry.before.total} → after ${entry.after.solved}/${entry.after.total} (hints opened: ${entry.before.hintsUsed} before, ${entry.after.hintsUsed} after)`,
                        `：学ぶ前 ${entry.before.solved}/${entry.before.total} → 学んだあと ${entry.after.solved}/${entry.after.total}（開いたヒント：前 ${entry.before.hintsUsed}、あと ${entry.after.hintsUsed}）`,
                      )}
                    </li>
                  ))}
                </ul>
                {report.lessonsOpenedBetween.length > 0 ? (
                  <p style={{ margin: 0 }}>
                    {t('Lessons opened in between: ', 'あいだに開いたレッスン：')}
                    {report.lessonsOpenedBetween
                      .map((path) => lessonTitle(path)[locale])
                      .join(t(', ', '、'))}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>

        <section data-testid="report-export" style={{ ...CARD, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {t('Keep or clear the record', '記録を保存する・消す')}
          </h2>
          <p style={{ margin: 0 }}>
            {t(
              `${state.attempts.length} attempts are recorded in this browser.`,
              `このブラウザに、${state.attempts.length} 回分の記録があります。`,
            )}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="report-download"
              onClick={download}
              style={SECONDARY}
            >
              {t('Download as a file', 'ファイルに保存する')}
            </button>
            <button type="button" data-testid="report-copy" onClick={copy} style={SECONDARY}>
              {t('Copy', 'コピーする')}
            </button>
            {confirming ? null : (
              <button
                type="button"
                data-testid="report-clear"
                onClick={() => setConfirming(true)}
                style={SECONDARY}
              >
                {t('Clear the record…', '記録を消す…')}
              </button>
            )}
          </div>
          <p data-testid="report-copy-status" role="status" style={{ margin: 0, minHeight: 24 }}>
            {copied === 'copied'
              ? t('✓ Copied.', '✓ コピーしました。')
              : copied === 'failed'
                ? t(
                    'This browser did not allow copying. Use “Download as a file” instead.',
                    'このブラウザではコピーできませんでした。「ファイルに保存する」を使ってください。',
                  )
                : ''}
          </p>
          {confirming ? (
            <div
              data-testid="report-clear-confirm"
              role="group"
              aria-label={t('Clear the record?', '記録を消しますか？')}
              style={{ display: 'grid', gap: 8 }}
            >
              <p style={{ margin: 0 }}>
                {t(
                  'This removes every attempt, every comparison and your level check from this browser. It cannot be undone.',
                  'このブラウザから、すべての記録・比べた結果・レベル判定を消します。元には戻せません。',
                )}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  data-testid="report-clear-yes"
                  onClick={() => {
                    store.clear();
                    setConfirming(false);
                  }}
                  style={{ ...SECONDARY, borderColor: 'var(--netlab-accent-orange)' }}
                >
                  {t('Yes, clear everything', 'はい、すべて消す')}
                </button>
                <button
                  type="button"
                  data-testid="report-clear-no"
                  onClick={() => setConfirming(false)}
                  style={SECONDARY}
                >
                  {t('No, keep it', 'いいえ、残す')}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <ExerciseShell
      title={{ en: 'Hands-on exercises: my record', ja: '実習問題：自分の記録' }}
      desc={{
        en: 'Each level in a sentence, before and after studying, and your record to keep.',
        ja: 'レベルごとの状況、学ぶ前後の比較、記録の保存。',
      }}
    >
      <ReportPageBody />
    </ExerciseShell>
  );
}

import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGalleryLocale, useT } from '../../localeContext';
import type { ExerciseLevel, Localised } from '../../packet-lab/model';
import type { AttemptStore } from '../store/attemptStore';
import { explain, headline, isAttempted, stillMissing, type LevelSummary } from '../store/estimate';
import type { AttemptRecord } from '../store/types';
import { ExerciseShell, outcomeWords, parseLevel } from '../ui/pageParts';
import { CARD, COLUMN, LINK, MUTED, PAGE, PRIMARY } from '../ui/styles';
import { StorageNotice, useExerciseStore } from '../ui/useExerciseStore';
import { PacketRunner } from './PacketRunner';
import {
  nextPacketFor,
  PACKET_LEVELS,
  PACKET_SCOPE,
  packetExercise,
  packetLevelPath,
  packetPath,
  packetSummary,
  packetTemplates,
  packetTitle,
  untracked,
} from './packetSource';

/** What each packet level is about. */
export const PACKET_LEVEL_NAMES: Readonly<Record<ExerciseLevel, Localised>> = {
  1: { en: 'Addresses: where a packet goes', ja: 'アドレス：パケットはどこへ行くか' },
  2: { en: 'TTL, MAC, ports and lists', ja: 'TTL・MAC・ポートと一覧' },
  3: { en: 'MTU, splitting, and the frame on each cable', ja: 'MTU・分割・区間ごとのフレーム' },
  4: { en: 'Whole splits and several faults', ja: '分割のすべてと、いくつもの原因' },
};

const linkStyle = { ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 } as const;

/** Where the learner stands at a packet level, in the two lines the device levels use. */
function PacketLevelLines({ summary }: { summary: LevelSummary }) {
  const locale = useGalleryLocale();
  const missing = stillMissing(summary, locale, packetTitle);
  return (
    <>
      <p
        data-testid={`packet-level-headline-${summary.level}`}
        data-status={summary.status}
        data-solved={summary.solved}
        data-counted={summary.counted}
        style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}
      >
        {headline(summary, locale)}
      </p>
      {missing ? (
        <p data-testid={`packet-level-missing-${summary.level}`} style={{ margin: 0 }}>
          {missing}
        </p>
      ) : null}
    </>
  );
}

/** The packet track's way in: four levels, each with where the learner stands and one button. */
export function PacketHubBody({ store: injected }: { store?: AttemptStore }) {
  const t = useT();
  const locale = useGalleryLocale();
  const { store, state } = useExerciseStore(injected, 'packet');
  return (
    <div style={PAGE}>
      <div style={COLUMN}>
        <header style={{ display: 'grid', gap: 6, color: 'var(--netlab-text-primary)' }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{t('Packet exercises', 'パケットの実習')}</h2>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            {t(
              'Work on the packet itself: fill in its fields, say how a router splits it, or read where it stopped and why. Each answer is run on the simulator.',
              'パケットそのものを扱います。欄を埋めたり、ルータがどう分割するかを答えたり、どこで・なぜ止まったかを読んだりします。答えはシミュレータで実際に動かして判定します。',
            )}
          </p>
          <Link to="/exercises" data-testid="packet-hub-back" style={linkStyle}>
            {t('← Hands-on exercises (settings)', '← 実習問題（設定）にもどる')}
          </Link>
        </header>
        <StorageNotice store={store} />
        {PACKET_LEVELS.map((level) => {
          const summary = packetSummary(state.attempts, level);
          const nextId = nextPacketFor(level, state.attempts);
          const begun = state.attempts.some(
            (attempt) => attempt.level === level && isAttempted(attempt),
          );
          return (
            <section
              key={level}
              data-testid={`packet-level-${level}`}
              aria-label={t(`Level ${level}`, `レベル ${level}`)}
              style={{ ...CARD, display: 'grid', gap: 10 }}
            >
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {t(`Level ${level}`, `レベル ${level}`)}
                <span style={{ fontWeight: 400 }}> — {PACKET_LEVEL_NAMES[level][locale]}</span>
              </h3>
              <PacketLevelLines summary={summary} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {nextId ? (
                  <Link
                    to={packetPath(nextId)}
                    data-testid={`packet-start-${level}`}
                    style={PRIMARY}
                  >
                    {begun
                      ? t(`Continue level ${level}`, `レベル ${level} をつづける`)
                      : t(`Start level ${level}`, `レベル ${level} をはじめる`)}
                  </Link>
                ) : null}
                <Link
                  to={packetLevelPath(level)}
                  data-testid={`packet-level-link-${level}`}
                  style={linkStyle}
                >
                  {t('What this level covers', 'このレベルの内容を見る')}
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** One packet level: the rule and where the learner stands, its kinds of task, and the record. */
export function PacketLevelBody({ store: injected }: { store?: AttemptStore }) {
  const t = useT();
  const locale = useGalleryLocale();
  const { level: levelText } = useParams<{ level: string }>();
  const level = parseLevel(levelText);
  const { store, state } = useExerciseStore(injected, 'packet');
  if (!level) {
    return (
      <div style={PAGE}>
        <div style={COLUMN}>
          <p data-testid="packet-level-missing" style={{ ...CARD, margin: 0 }}>
            {t('There is no such level.', 'そのレベルはありません。')}{' '}
            <Link to="/exercises/packet" style={LINK}>
              {t('Back to the packet exercises', 'パケットの実習へ')}
            </Link>
          </p>
        </div>
      </div>
    );
  }
  const summary = packetSummary(state.attempts, level);
  const nextId = nextPacketFor(level, state.attempts);
  const mine: AttemptRecord[] = state.attempts
    .filter((attempt) => attempt.level === level && isAttempted(attempt))
    .slice()
    .reverse();
  return (
    <div style={PAGE}>
      <div style={COLUMN}>
        <Link to="/exercises/packet" data-testid="packet-level-back" style={linkStyle}>
          {t('← Packet exercises', '← パケットの実習')}
        </Link>
        <section
          data-testid="packet-level-page"
          data-level={level}
          style={{ ...CARD, display: 'grid', gap: 10 }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {t(`Packet level ${level}`, `パケット レベル ${level}`)} —{' '}
            {PACKET_LEVEL_NAMES[level][locale]}
          </h2>
          <PacketLevelLines summary={summary} />
          <p data-testid="packet-level-rule" style={{ margin: 0 }}>
            {explain(summary, locale, PACKET_SCOPE)}
          </p>
          {nextId ? (
            <div>
              <Link to={packetPath(nextId)} data-testid="packet-level-start" style={PRIMARY}>
                {t('Next exercise', 'つぎの問題')}
              </Link>
            </div>
          ) : null}
        </section>
        <StorageNotice store={store} />
        <section
          style={{ ...CARD, display: 'grid', gap: 6 }}
          aria-label={t('Kinds of task', '問題の種類')}
        >
          <h3 style={{ margin: 0, fontSize: 17 }}>
            {t('Kinds of task at this level', 'このレベルの問題の種類')}
          </h3>
          <ul data-testid="packet-level-kinds" style={{ margin: 0 }}>
            {packetTemplates(level).map((template) => (
              <li key={template.id} data-testid={`packet-kind-${template.id}`}>
                {template.title[locale]}
              </li>
            ))}
          </ul>
        </section>
        <section style={{ ...CARD, display: 'grid', gap: 6 }} aria-label={t('Your record', '記録')}>
          <h3 style={{ margin: 0, fontSize: 17 }}>
            {t('What you have done here', 'このレベルの記録')}
          </h3>
          {mine.length === 0 ? (
            <p data-testid="packet-level-record-empty" style={{ ...MUTED, margin: 0 }}>
              {t('Nothing yet.', 'まだありません。')}
            </p>
          ) : (
            <ul data-testid="packet-level-record" style={{ margin: 0 }}>
              {mine.map((attempt) => (
                <li key={attempt.id} data-testid="packet-level-record-item">
                  <Link to={packetPath(attempt.exerciseId)} style={LINK}>
                    {packetTitle(attempt.templateId)?.[locale] ?? untracked(attempt.templateId)}
                  </Link>
                  {' — '}
                  {outcomeWords(attempt)[locale]}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** One packet exercise, by its packet-lab id. */
export function PacketExerciseBody({ store: injected }: { store?: AttemptStore }) {
  const t = useT();
  const locale = useGalleryLocale();
  const navigate = useNavigate();
  const { exerciseId = '' } = useParams<{ exerciseId: string }>();
  const { store } = useExerciseStore(injected, 'packet');
  const exercise = useMemo(() => packetExercise(exerciseId, locale), [exerciseId, locale]);
  if (!exercise) {
    return (
      <div style={PAGE}>
        <div style={COLUMN}>
          <section
            data-testid="packet-exercise-missing"
            style={{ ...CARD, display: 'grid', gap: 12 }}
          >
            <p style={{ margin: 0 }}>
              {t('This exercise could not be found.', 'この問題は見つかりませんでした。')}
            </p>
            <div>
              <Link to="/exercises/packet" style={PRIMARY}>
                {t('Go to the packet exercises', 'パケットの実習へ')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }
  const onNext = () => {
    const nextId = nextPacketFor(exercise.level, store.getState().attempts, exercise.id);
    void navigate(nextId ? packetPath(nextId) : packetLevelPath(exercise.level));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <nav
        aria-label={t('Where you are', '現在の場所')}
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--netlab-border)',
          flexShrink: 0,
        }}
      >
        <Link
          to={packetLevelPath(exercise.level)}
          data-testid="packet-back-to-level"
          style={linkStyle}
        >
          {t(`← Packet level ${exercise.level}`, `← パケット レベル ${exercise.level}`)}
        </Link>
      </nav>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <PacketRunner key={exercise.id} exercise={exercise} store={store} onNext={onNext} />
      </div>
    </div>
  );
}

export function PacketHub() {
  return (
    <ExerciseShell
      title={{ en: 'Packet exercises', ja: 'パケットの実習' }}
      desc={{
        en: 'Build, split and read packets; the simulator judges every answer.',
        ja: 'パケットを組み立て、分割し、読み取ります。答えはシミュレータが判定します。',
      }}
    >
      <PacketHubBody />
    </ExerciseShell>
  );
}

export function PacketLevelPage() {
  return (
    <ExerciseShell
      title={{ en: 'Packet exercises', ja: 'パケットの実習' }}
      desc={{ en: 'One level of the packet exercises.', ja: 'パケットの実習の 1 つのレベル。' }}
    >
      <PacketLevelBody />
    </ExerciseShell>
  );
}

export function PacketExercisePage() {
  return (
    <ExerciseShell
      title={{ en: 'Packet exercise', ja: 'パケットの実習' }}
      desc={{
        en: 'Fill in, split or read a packet, then check it on the simulator.',
        ja: 'パケットを埋める・分ける・読み取って、シミュレータでたしかめます。',
      }}
    >
      <PacketExerciseBody />
    </ExerciseShell>
  );
}

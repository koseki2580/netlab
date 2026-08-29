import { useEffect, useId, useMemo, useRef } from 'react';
import { useI18n } from '../../../i18n';
import { shortcutRegistry } from '../../../sandbox/shortcuts/registry';
import type { RecordedEvent, RecordedEventKind } from '../../../sandbox/recording/types';
import { useReplay } from '../../../sandbox/recording/useReplay';
import type { ReplaySpeed } from '../../../sandbox/recording/player';

const TICK_COLOR: Record<RecordedEventKind, string> = {
  edit: 'var(--netlab-color-accent, var(--netlab-accent-blue))',
  'mode-changed': 'var(--netlab-color-warning, #d97706)',
  'tab-opened': 'var(--netlab-color-neutral, var(--netlab-text-secondary))',
  paused: 'var(--netlab-color-neutral, var(--netlab-text-secondary))',
  resumed: 'var(--netlab-color-neutral, var(--netlab-text-secondary))',
  forked: 'var(--netlab-color-accent, var(--netlab-accent-blue))',
};

const SCRUBBER_TEST_ID = 'sandbox-replay-scrubber';

function findNextEditSeq(
  events: readonly RecordedEvent[],
  currentSeq: number,
  direction: 1 | -1,
): number | null {
  let i = currentSeq + direction;
  while (i >= 0 && i < events.length) {
    if (events[i]?.kind === 'edit') return i;
    i += direction;
  }
  return null;
}

interface ReplayScrubberProps {
  readonly testId?: string;
}

export function ReplayScrubber({ testId = SCRUBBER_TEST_ID }: ReplayScrubberProps) {
  const replay = useReplay();
  const { t } = useI18n();
  const trackId = useId();
  const trackRef = useRef<HTMLInputElement | null>(null);

  const isPlaying = replay.status === 'playing';
  const isFinished = replay.status === 'finished';
  const isDesynced = replay.status === 'desynced';

  const ticks = useMemo(() => {
    const total = Math.max(1, replay.totalEvents);
    return replay.recording.events.map((event, index) => ({
      seq: event.seq,
      kind: event.kind,
      leftPct: total === 1 ? 0 : (index / (total - 1)) * 100,
    }));
  }, [replay.recording.events, replay.totalEvents]);

  useEffect(() => {
    if (!replay.isActive) return undefined;
    const offs: (() => void)[] = [];
    offs.push(
      shortcutRegistry.register({
        key: ' ',
        description: 'Replay: play / pause',
        action: () => (isPlaying ? replay.pause() : replay.play()),
      }),
    );
    offs.push(
      shortcutRegistry.register({
        key: 'ArrowLeft',
        description: 'Replay: step backward',
        action: () => replay.stepBackward(),
      }),
    );
    offs.push(
      shortcutRegistry.register({
        key: 'ArrowRight',
        description: 'Replay: step forward',
        action: () => replay.stepForward(),
      }),
    );
    offs.push(
      shortcutRegistry.register({
        key: 'Shift+ArrowLeft',
        description: 'Replay: skip to previous edit',
        action: () => {
          const seq = findNextEditSeq(replay.recording.events, replay.currentSeq, -1);
          if (seq !== null) replay.seek(seq);
        },
      }),
    );
    offs.push(
      shortcutRegistry.register({
        key: 'Shift+ArrowRight',
        description: 'Replay: skip to next edit',
        action: () => {
          const seq = findNextEditSeq(replay.recording.events, replay.currentSeq, 1);
          if (seq !== null) replay.seek(seq);
        },
      }),
    );
    offs.push(
      shortcutRegistry.register({
        key: 'Home',
        description: 'Replay: jump to start',
        action: () => replay.seek(-1),
      }),
    );
    offs.push(
      shortcutRegistry.register({
        key: 'End',
        description: 'Replay: jump to end',
        action: () => replay.seek(replay.totalEvents - 1),
      }),
    );
    offs.push(
      shortcutRegistry.register({
        key: 'F',
        description: 'Replay: fork from here',
        action: () => {
          replay.fork();
        },
      }),
    );
    return () => {
      for (const off of offs) off();
    };
  }, [
    isPlaying,
    replay,
    replay.isActive,
    replay.currentSeq,
    replay.recording.events,
    replay.totalEvents,
  ]);

  if (!replay.isActive) return null;
  if (replay.totalEvents === 0) return null;

  const max = replay.totalEvents - 1;

  return (
    <div
      data-testid={testId}
      role="group"
      aria-label={t('sandbox.recording.replay.label')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '8px 12px',
        borderTop: '1px solid var(--netlab-color-border, var(--netlab-text-primary))',
        background: 'var(--netlab-color-surface, #f8fafc)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          aria-label={
            isPlaying
              ? t('sandbox.recording.replay.pauseLabel')
              : t('sandbox.recording.replay.playLabel')
          }
          aria-pressed={isPlaying}
          disabled={isDesynced || (isFinished && !isPlaying)}
          onClick={() => (isPlaying ? replay.pause() : replay.play())}
          className="netlab-focus-ring"
          style={{ minWidth: 72 }}
        >
          {isPlaying ? t('sandbox.recording.replay.pause') : t('sandbox.recording.replay.play')}
        </button>
        <button
          type="button"
          aria-label={t('sandbox.recording.replay.stepBackward')}
          disabled={isDesynced || replay.currentSeq <= -1}
          onClick={() => replay.stepBackward()}
          className="netlab-focus-ring"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label={t('sandbox.recording.replay.stepForward')}
          disabled={isDesynced || replay.currentSeq >= max}
          onClick={() => replay.stepForward()}
          className="netlab-focus-ring"
        >
          ›
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12 }}>{t('sandbox.recording.replay.speed')}</span>
          <select
            aria-label={t('sandbox.recording.replay.speedLabel')}
            value={replay.speed}
            onChange={(event) => {
              const next = Number(event.target.value) as ReplaySpeed;
              if (next === 1 || next === 2 || next === 4 || next === 8) {
                replay.setSpeed(next);
              }
            }}
            className="netlab-focus-ring"
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
            <option value={8}>8×</option>
          </select>
        </label>
        <span style={{ fontSize: 12, marginLeft: 'auto' }}>
          {Math.max(0, replay.currentSeq + 1)} / {replay.totalEvents}
        </span>
        <button
          type="button"
          aria-label={t('sandbox.recording.replay.fork.label')}
          onClick={() => replay.fork()}
          className="netlab-focus-ring"
        >
          {t('sandbox.recording.replay.fork.text')}
        </button>
      </div>
      <div style={{ position: 'relative', height: 24 }}>
        <input
          ref={trackRef}
          id={trackId}
          type="range"
          min={-1}
          max={max}
          step={1}
          value={replay.currentSeq}
          aria-label={t('sandbox.recording.replay.timeline')}
          aria-valuetext={t('sandbox.recording.replay.valueText', {
            current: Math.max(0, replay.currentSeq + 1),
            total: replay.totalEvents,
          })}
          disabled={isDesynced}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) replay.seek(next);
          }}
          style={{ width: '100%' }}
          className="netlab-focus-ring"
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 18,
            left: 0,
            right: 0,
            display: 'block',
            pointerEvents: 'none',
            height: 6,
          }}
        >
          {ticks.map((tick) => (
            <span
              key={tick.seq}
              data-testid={`replay-tick-${tick.seq}`}
              style={{
                position: 'absolute',
                left: `${tick.leftPct}%`,
                width: 2,
                height: 6,
                background: TICK_COLOR[tick.kind],
                transform: 'translateX(-1px)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

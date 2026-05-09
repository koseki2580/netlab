import { useEffect, useRef, useState } from 'react';
import type { HookEngine } from '../../hooks/HookEngine';
import { useI18n } from '../../i18n/useI18n';
import type { Edit } from '../edits';
import type { SandboxMode } from '../types';
import {
  editAppliedMessage,
  editRedoneMessage,
  editUndoneMessage,
  modeChangedMessage,
  resetAllMessage,
} from './messages';

const THROTTLE_MS = 500;

interface Props {
  readonly hookEngine: HookEngine;
}

export function SandboxNarrationRegion({ hookEngine }: Props) {
  const { t } = useI18n();
  const [announcement, setAnnouncement] = useState('');
  const pendingRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enqueue = (text: string) => {
    if (!text) return;
    pendingRef.current = text;
    if (timerRef.current !== null) return;
    timerRef.current = setTimeout(() => {
      setAnnouncement(pendingRef.current);
      pendingRef.current = '';
      timerRef.current = null;
    }, THROTTLE_MS);
  };

  useEffect(() => {
    const unsubs = [
      hookEngine.on('sandbox:edit-applied', async (payload, next) => {
        enqueue(editAppliedMessage(t, payload.edit as Edit));
        await next();
      }),
      hookEngine.on('sandbox:edit-undone', async (payload, next) => {
        enqueue(editUndoneMessage(t, payload.edit as Edit));
        await next();
      }),
      hookEngine.on('sandbox:edit-redone', async (payload, next) => {
        enqueue(editRedoneMessage(t, payload.edit as Edit));
        await next();
      }),
      hookEngine.on('sandbox:mode-changed', async (payload, next) => {
        enqueue(modeChangedMessage(t, payload.mode as SandboxMode));
        await next();
      }),
      hookEngine.on('sandbox:reset-all', async (_payload, next) => {
        enqueue(resetAllMessage(t));
        await next();
      }),
    ];

    return () => {
      for (const unsub of unsubs) unsub();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hookEngine, t]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      data-testid="sandbox-narration-region"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announcement}
    </div>
  );
}

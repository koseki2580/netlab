import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NetlabContext } from '../../components/NetlabContext';
import { NetlabError } from '../../errors';
import { hookEngine as sharedHookEngine } from '../../hooks/HookEngine';
import { SandboxIntroContext } from '../intro/SandboxIntroProvider';
import { cloneSnapshot } from '../SimulationSnapshot';
import { useSandbox } from '../useSandbox';
import type { SandboxMode } from '../types';
import {
  RECORDING_EVENT_LIMIT,
  RECORDING_EVENT_WARN_THRESHOLD,
  RECORDING_SCHEMA_VERSION,
  type RecordedEvent,
  type RecordedEventKind,
  type RecordedSession,
  type RecordingMetadata,
} from './types';

export const SANDBOX_RECORDING_TOOL_VERSION = '0.1.0';

export interface SandboxRecorderContextValue {
  readonly isRecording: boolean;
  readonly eventCount: number;
  readonly limitReached: boolean;
  readonly warnThresholdReached: boolean;
  readonly stopAndExport: (metadata: RecordingMetadataInput) => RecordedSession;
}

export interface RecordingMetadataInput {
  readonly title: string;
  readonly author: string;
  readonly scenarioId: string;
  readonly toolVersion?: string;
}

export const SandboxRecorderContext = createContext<SandboxRecorderContextValue | null>(null);

export interface SandboxRecorderProviderProps {
  readonly children: ReactNode;
  readonly enabled?: boolean;
}

function isIntroActive(introContextValue: ReturnType<typeof useIntroContext>): boolean {
  if (!introContextValue) return false;
  return introContextValue.status === 'active' || introContextValue.status === 'pending';
}

function useIntroContext() {
  return useContext(SandboxIntroContext);
}

export function SandboxRecorderProvider({
  children,
  enabled = true,
}: SandboxRecorderProviderProps) {
  const sandbox = useSandbox();
  const intro = useIntroContext();
  const netlabContext = useContext(NetlabContext);
  const hookEngine = netlabContext?.hookEngine ?? sharedHookEngine;

  const startedAtRef = useRef<number>(performance.now());
  const lastWallRef = useRef<number>(performance.now());
  const initialSnapshotRef = useRef(cloneSnapshot(sandbox.engine.snapshot));
  const previousModeRef = useRef<SandboxMode>(sandbox.mode);
  const eventsRef = useRef<RecordedEvent[]>([]);
  const seqRef = useRef(0);
  const [eventCount, setEventCount] = useState(0);
  const limitReached = eventCount >= RECORDING_EVENT_LIMIT;
  const warnThresholdReached = eventCount >= RECORDING_EVENT_WARN_THRESHOLD;

  if (enabled && isIntroActive(intro)) {
    throw new NetlabError({
      code: 'sandbox-recording/intro-active',
      message: '[netlab] cannot start recording while a sandbox intro tutorial is running',
    });
  }

  const pushEvent = useCallback(
    (
      kind: RecordedEventKind,
      payload: unknown,
      resultingSnapshotId: string,
      captureSnapshot: boolean,
    ) => {
      if (eventsRef.current.length >= RECORDING_EVENT_LIMIT) {
        return;
      }
      const now = performance.now();
      const wallDeltaMs = Math.max(0, now - lastWallRef.current);
      lastWallRef.current = now;
      const event: RecordedEvent = {
        seq: seqRef.current,
        kind,
        stepIndex: sandbox.engine.snapshot.state.currentStep,
        wallDeltaMs,
        payload,
        resultingSnapshotId,
        ...(captureSnapshot ? { resultingSnapshot: cloneSnapshot(sandbox.engine.snapshot) } : {}),
      };
      seqRef.current += 1;
      eventsRef.current = [...eventsRef.current, event];
      setEventCount(eventsRef.current.length);
    },
    [sandbox.engine],
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const offEdit = hookEngine.on('sandbox:edit-applied', async ({ edit }, next) => {
      pushEvent('edit', { edit }, sandbox.engine.snapshot.id, true);
      await next();
    });

    const offMode = hookEngine.on('sandbox:mode-changed', async ({ mode }, next) => {
      const from = previousModeRef.current;
      previousModeRef.current = mode;
      pushEvent('mode-changed', { from, to: mode }, '', false);
      await next();
    });

    const offTab = hookEngine.on('sandbox:panel-tab-opened', async ({ axis }, next) => {
      pushEvent('tab-opened', { tabId: axis }, '', false);
      await next();
    });

    return () => {
      offEdit();
      offMode();
      offTab();
    };
  }, [enabled, hookEngine, pushEvent, sandbox.engine]);

  const stopAndExport = useCallback((metadataInput: RecordingMetadataInput): RecordedSession => {
    const durationMs = Math.max(0, performance.now() - startedAtRef.current);
    const metadata: RecordingMetadata = {
      title: metadataInput.title,
      author: metadataInput.author,
      recordedAt: new Date().toISOString(),
      durationMs,
      toolVersion: metadataInput.toolVersion ?? SANDBOX_RECORDING_TOOL_VERSION,
      scenarioId: metadataInput.scenarioId,
    };
    return {
      kind: 'recording',
      schemaVersion: RECORDING_SCHEMA_VERSION,
      initialSnapshot: initialSnapshotRef.current,
      events: eventsRef.current,
      metadata,
    };
  }, []);

  const value = useMemo<SandboxRecorderContextValue>(
    () => ({
      isRecording: enabled,
      eventCount,
      limitReached,
      warnThresholdReached,
      stopAndExport,
    }),
    [enabled, eventCount, limitReached, warnThresholdReached, stopAndExport],
  );

  return (
    <SandboxRecorderContext.Provider value={value}>{children}</SandboxRecorderContext.Provider>
  );
}

export function useSandboxRecorder(): SandboxRecorderContextValue {
  const context = useContext(SandboxRecorderContext);
  if (!context) {
    throw new NetlabError({
      code: 'sandbox-recording/missing-sandbox',
      message:
        '[netlab] useSandboxRecorder must be used within <SandboxRecorderProvider> nested in <SandboxProvider>',
    });
  }
  return context;
}

import { useContext, useEffect, useRef } from 'react';
import { currentSandboxScenarioId } from '../components/sandbox/sessionScenario';
import { NetlabContext } from '../components/NetlabContext';
import { useSandbox } from '../sandbox/useSandbox';
import type { ParentOrigin, SandboxChildEvent } from './protocol';
import { NETLAB_EMBED_PROTOCOL_VERSION } from './protocol';
import { normalizeParentOrigins } from './originValidator';

const EDIT_COUNT_DEBOUNCE_MS = 100;

function postSandboxEvent(parentOrigin: ParentOrigin | undefined, event: SandboxChildEvent): void {
  const origins = normalizeParentOrigins(parentOrigin);
  if (origins.length === 0) return;

  for (const origin of origins) {
    window.parent.postMessage(event, origin);
  }
}

export function EmbedBridge() {
  const netlabContext = useContext(NetlabContext);
  const sandbox = useSandbox();
  const parentOrigin = netlabContext?.parentOrigin;
  const hookEngine = netlabContext?.hookEngine;
  const editCountRef = useRef(sandbox.session.size());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    editCountRef.current = sandbox.session.size();
  }, [sandbox.session]);

  useEffect(() => {
    if (!hookEngine || normalizeParentOrigins(parentOrigin).length === 0) return undefined;

    const scenarioId = currentSandboxScenarioId();
    const post = (event: SandboxChildEvent) => postSandboxEvent(parentOrigin, event);
    const scheduleEditCount = (count: number) => {
      editCountRef.current = Math.max(0, count);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        post({
          type: 'sandbox-edit-count-changed',
          count: editCountRef.current,
          scenarioId,
        });
      }, EDIT_COUNT_DEBOUNCE_MS);
    };

    post({
      type: 'sandbox-ready',
      version: NETLAB_EMBED_PROTOCOL_VERSION,
      scenarioId,
      editCount: editCountRef.current,
    });

    const unsubscribers = [
      hookEngine.on('sandbox:edit-applied', async (_payload, next) => {
        scheduleEditCount(editCountRef.current + 1);
        await next();
      }),
      hookEngine.on('sandbox:edit-undone', async ({ head }, next) => {
        scheduleEditCount(head);
        await next();
      }),
      hookEngine.on('sandbox:edit-redone', async ({ head }, next) => {
        scheduleEditCount(head);
        await next();
      }),
      hookEngine.on('sandbox:edit-reverted', async ({ head }, next) => {
        scheduleEditCount(head);
        await next();
      }),
      hookEngine.on('sandbox:snapshot-reverted', async ({ head }, next) => {
        scheduleEditCount(head);
        await next();
      }),
      hookEngine.on('sandbox:reset-all', async (_payload, next) => {
        scheduleEditCount(0);
        await next();
      }),
      hookEngine.on('sandbox:assessment-passed', async (payload, next) => {
        post({ type: 'sandbox-assessment-passed', ...payload });
        await next();
      }),
      hookEngine.on('sandbox:session-exported', async (payload, next) => {
        post({ type: 'sandbox-session-exported', ...payload });
        await next();
      }),
    ];

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [hookEngine, parentOrigin]);

  return null;
}

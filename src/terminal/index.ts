import type { TerminalContext, TerminalResult } from './types';

export type {
  ServerApp,
  TerminalContext,
  TerminalEngine,
  TerminalResult,
  WebPage,
  WebSite,
  WebSites,
} from './types';

/**
 * Run one command line on a host of the topology, on the simulator, and get
 * the lines a terminal prints (REQ-358). The commands load the first time one
 * runs, so a page with no terminal never downloads them.
 */
export async function runTerminalCommand(
  line: string,
  context: TerminalContext,
): Promise<TerminalResult> {
  const { runCommand } = await import('./terminalCommands');
  return runCommand(line, context);
}

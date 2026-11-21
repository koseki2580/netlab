import { useEffect, useRef, useState } from 'react';
import {
  runTerminalCommand,
  type ServerApp,
  type TerminalEngine,
  type WebSites,
} from '../../src/terminal';
import { useViewport } from '../../src/utils/useViewport';
import { useGalleryLocale, useT } from '../localeContext';

type Xterm = import('@xterm/xterm').Terminal;

/** The commands and names Tab completes. */
const COMPLETIONS = [
  'help',
  'clear',
  'ping',
  'traceroute',
  'nslookup',
  'dig',
  'curl',
  'dhclient',
  'ip addr',
  'ip route',
  'arp -a',
  'ss -t',
];

const TRANSCRIPT_LINES = 60;

const HIDDEN: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

/**
 * A terminal on one device (REQ-360): xterm.js, loaded the first time the
 * panel shows, reads a line, runs it on the simulator with
 * `runTerminalCommand`, and prints what comes back. Each command and its
 * output also go to an `aria-live` transcript. On a phone a plain input line
 * under the terminal takes the typing, where the soft keyboard and the IME work.
 */
export function TerminalPanel({
  engine,
  nodeId,
  host,
  web,
  apps,
  names,
  pending,
  onRun,
}: {
  engine: TerminalEngine;
  nodeId: string;
  /** The prompt's host name. */
  host: string;
  web: WebSites;
  /** Learner-written apps running on servers, which answer in place of their static pages (REQ-416). */
  apps?: Readonly<Record<string, ServerApp>>;
  /** Device and DNS names Tab completes after a command. */
  names: readonly string[];
  /** A command to type and run, from the suggestions beside the terminal. */
  pending?: { readonly line: string; readonly id: number } | null;
  /** Each command run, with the device it ran on and what it printed. */
  onRun?: (run: { nodeId: string; line: string; lines: readonly string[] }) => void;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const { isNarrow } = useViewport();
  const screen = useRef<HTMLDivElement>(null);
  const term = useRef<Xterm | null>(null);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const latest = useRef({ engine, nodeId, web, apps, locale, names, host, onRun });
  latest.current = { engine, nodeId, web, apps, locale, names, host, onRun };
  const run = useRef<(line: string) => Promise<void>>(async () => {});
  const switched = useRef<(host: string) => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/xterm/css/xterm.css'),
      ]);
      if (disposed || !screen.current) return;
      const terminal = new Terminal({
        convertEol: true,
        cursorBlink: true,
        screenReaderMode: true,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 14,
        theme: { background: '#0d1117', foreground: '#d6e2ee', cursor: '#3fb950' },
      });
      const fit = new FitAddon();
      terminal.loadAddon(fit);
      terminal.open(screen.current);
      fit.fit();
      term.current = terminal;

      const prompt = () => terminal.write(`\x1b[32m${latest.current.host}$\x1b[0m `);
      let line = '';
      const history: string[] = [];
      let back = 0;
      const replaceLine = (next: string) => {
        terminal.write('\b \b'.repeat(line.length));
        line = next;
        terminal.write(line);
      };

      run.current = async (command: string) => {
        if (busy.current) return;
        busy.current = true;
        const { engine: e, nodeId: id, web: w, apps: a, locale: l, host: h } = latest.current;
        try {
          const result = await runTerminalCommand(command, {
            engine: e,
            nodeId: id,
            web: w,
            ...(a ? { apps: a } : {}),
            locale: l,
          });
          if (result.clear) terminal.clear();
          for (const out of result.lines) terminal.writeln(out);
          setTranscript((previous) =>
            [...previous, `${h}$ ${command}`, ...result.lines].slice(-TRANSCRIPT_LINES),
          );
          latest.current.onRun?.({ nodeId: id, line: command, lines: result.lines });
        } finally {
          busy.current = false;
          prompt();
        }
      };

      // Another device chosen: say so, and prompt as that device.
      switched.current = (next: string) => {
        terminal.write(`\r\n\x1b[90m-- ${next} --\x1b[0m\r\n`);
        line = '';
        if (!busy.current) prompt();
        setTranscript((previous) => [...previous, `-- ${next} --`].slice(-TRANSCRIPT_LINES));
      };

      const data = terminal.onData((key) => {
        if (busy.current) return;
        if (key === '\r') {
          terminal.write('\r\n');
          const command = line;
          line = '';
          back = 0;
          if (command.trim()) history.push(command);
          if (command.trim()) void run.current(command);
          else prompt();
        } else if (key === '\x7f') {
          if (line.length > 0) {
            line = line.slice(0, -1);
            terminal.write('\b \b');
          }
        } else if (key === '\x03') {
          terminal.write('^C\r\n');
          line = '';
          prompt();
        } else if (key === '\x1b[A' || key === '\x1b[B') {
          back = Math.max(0, Math.min(history.length, back + (key === '\x1b[A' ? 1 : -1)));
          replaceLine(back === 0 ? '' : (history[history.length - back] ?? ''));
        } else if (key === '\t') {
          const words = line.split(' ');
          const last = words[words.length - 1] ?? '';
          const pool = words.length === 1 ? COMPLETIONS : latest.current.names;
          const match = pool.filter((candidate) => candidate.startsWith(last));
          if (last && match.length === 1) {
            words[words.length - 1] = `${match[0]} `;
            replaceLine(words.join(' '));
          }
        } else if (key >= ' ' && !key.startsWith('\x1b')) {
          line += key;
          terminal.write(key);
        }
      });
      const resize = new ResizeObserver(() => fit.fit());
      resize.observe(screen.current);
      terminal.writeln(
        latest.current.locale === 'ja'
          ? 'netlab の端末です。コマンドはシミュレータの上で動きます。help で一覧を出します。'
          : 'netlab terminal: commands run on the simulator. Type help for the list.',
      );
      prompt();
      setReady(true);
      cleanup = () => {
        data.dispose();
        resize.disconnect();
        terminal.dispose();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
      term.current = null;
    };
  }, []);

  const shownHost = useRef(host);
  useEffect(() => {
    if (shownHost.current === host) return;
    shownHost.current = host;
    switched.current(host);
  }, [host]);

  // A suggestion pressed beside the terminal: type it, then run it.
  useEffect(() => {
    const terminal = term.current;
    if (!pending || !terminal || busy.current) return;
    terminal.write(`${pending.line}\r\n`);
    void run.current(pending.line);
  }, [pending, ready]);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        ref={screen}
        data-testid="terminal-screen"
        aria-label={t('Terminal', '端末')}
        style={{
          height: isNarrow ? 300 : 420,
          background: '#0d1117',
          borderRadius: 8,
          padding: 8,
          overflow: 'hidden',
        }}
      />
      {!ready ? (
        <p
          data-testid="terminal-loading"
          style={{ margin: 0, color: 'var(--netlab-text-secondary)' }}
        >
          {t('Loading the terminal…', '端末を読み込んでいます…')}
        </p>
      ) : null}
      {isNarrow ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const command = typed.trim();
            if (!command || !term.current) return;
            term.current.write(`${command}\r\n`);
            setTyped('');
            void run.current(command);
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            data-testid="terminal-input"
            aria-label={t('Command', 'コマンド')}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1,
              minHeight: 44,
              fontFamily: 'monospace',
              fontSize: 16,
              padding: '0 8px',
            }}
          />
          <button type="submit" data-testid="terminal-run" style={{ minHeight: 44, minWidth: 64 }}>
            {t('Run the command', 'コマンドを実行')}
          </button>
        </form>
      ) : null}
      <div role="log" aria-live="polite" data-testid="terminal-transcript" style={HIDDEN}>
        {transcript.map((entry, index) => (
          <div key={index}>{entry}</div>
        ))}
      </div>
    </div>
  );
}
